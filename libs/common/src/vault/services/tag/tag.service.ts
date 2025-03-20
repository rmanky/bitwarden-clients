// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Observable, Subject, firstValueFrom, map, shareReplay, switchMap, merge } from "rxjs";

import { KeyService } from "@bitwarden/key-management";

import { EncryptService } from "../../../key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "../../../platform/abstractions/i18n.service";
import { Utils } from "../../../platform/misc/utils";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { StateProvider } from "../../../platform/state";
import { UserId } from "../../../types/guid";
import { UserKey } from "../../../types/key";
import { CipherService } from "../../../vault/abstractions/cipher.service";
import { InternalTagService as InternalTagServiceAbstraction } from "../../../vault/abstractions/tag/tag.service.abstraction";
import { TagData } from "../../../vault/models/data/tag.data";
import { Tag } from "../../../vault/models/domain/tag";
import { TagView } from "../../../vault/models/view/tag.view";
import { Cipher } from "../../models/domain/cipher";
import { TagWithIdRequest } from "../../models/request/tag-with-id.request";
import { TAG_DECRYPTED_TAGS, TAG_ENCRYPTED_TAGS } from "../key-state/tag.state";

export class TagService implements InternalTagServiceAbstraction {
  /**
   * Ensures we reuse the same observable stream for each userId rather than
   * creating a new one on each tagViews$ call.
   */
  private tagViewCache = new Map<UserId, Observable<TagView[]>>();

  /**
   * Used to force the tagviews$ Observable to re-emit with a provided value.
   * Required because shareReplay with refCount: false maintains last emission.
   * Used during cleanup to force emit empty arrays, ensuring stale data isn't retained.
   */
  private forceTagViews: Record<UserId, Subject<TagView[]>> = {};

  constructor(
    private keyService: KeyService,
    private encryptService: EncryptService,
    private i18nService: I18nService,
    private cipherService: CipherService,
    private stateProvider: StateProvider,
  ) {}

  tags$(userId: UserId): Observable<Tag[]> {
    return this.encryptedTagsState(userId).state$.pipe(
      map((tags) => {
        if (tags == null) {
          return [];
        }

        return Object.values(tags).map((f) => new Tag(f));
      }),
    );
  }

  /**
   * Returns an Observable of decrypted tag views for the given userId.
   * Uses tagViewCache to maintain a single Observable instance per user,
   * combining normal tag state updates with forced updates.
   */
  tagViews$(userId: UserId): Observable<TagView[]> {
    if (!this.tagViewCache.has(userId)) {
      if (!this.forceTagViews[userId]) {
        this.forceTagViews[userId] = new Subject<TagView[]>();
      }

      const observable = merge(
        this.forceTagViews[userId],
        this.encryptedTagsState(userId).state$.pipe(
          switchMap((tagData) => {
            return this.decryptTags(userId, tagData);
          }),
        ),
      ).pipe(shareReplay({ refCount: false, bufferSize: 1 }));

      this.tagViewCache.set(userId, observable);
    }

    return this.tagViewCache.get(userId);
  }

  // TODO: This should be moved to EncryptService or something
  async encrypt(model: TagView, key: SymmetricCryptoKey): Promise<Tag> {
    const tag = new Tag();
    tag.id = model.id;
    tag.name = await this.encryptService.encrypt(model.name, key);
    return tag;
  }

  async get(id: string, userId: UserId): Promise<Tag> {
    const tags = await firstValueFrom(this.tags$(userId));

    return tags.find((tag) => tag.id === id);
  }

  getDecrypted$(id: string, userId: UserId): Observable<TagView | undefined> {
    return this.tagViews$(userId).pipe(
      map((tags) => tags.find((tag) => tag.id === id)),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );
  }

  async getAllFromState(userId: UserId): Promise<Tag[]> {
    return await firstValueFrom(this.tags$(userId));
  }

  /**
   * @deprecated For the CLI only
   * @param id id of the tag
   */
  async getFromState(id: string, userId: UserId): Promise<Tag> {
    const tag = await this.get(id, userId);
    if (!tag) {
      return null;
    }

    return tag;
  }

  /**
   * @deprecated Only use in CLI!
   */
  async getAllDecryptedFromState(userId: UserId): Promise<TagView[]> {
    return await firstValueFrom(this.tagViews$(userId));
  }

  async upsert(tagData: TagData | TagData[], userId: UserId): Promise<void> {
    await this.clearDecryptedTagState(userId);
    await this.encryptedTagsState(userId).update((tags) => {
      if (tags == null) {
        tags = {};
      }

      if (tagData instanceof TagData) {
        const f = tagData as TagData;
        tags[f.id] = f;
      } else {
        (tagData as TagData[]).forEach((f) => {
          tags[f.id] = f;
        });
      }

      return tags;
    });
  }

  async replace(tags: { [id: string]: TagData }, userId: UserId): Promise<void> {
    if (!tags) {
      return;
    }
    await this.clearDecryptedTagState(userId);
    await this.stateProvider.getUser(userId, TAG_ENCRYPTED_TAGS).update(() => {
      const newTags: Record<string, TagData> = { ...tags };
      return newTags;
    });
  }

  async clearDecryptedTagState(userId: UserId): Promise<void> {
    if (userId == null) {
      throw new Error("User ID is required.");
    }

    await this.setDecryptedTags([], userId);
  }

  async clear(userId: UserId): Promise<void> {
    this.forceTagViews[userId]?.next([]);

    await this.encryptedTagsState(userId).update(() => ({}));
    await this.clearDecryptedTagState(userId);
  }

  async delete(id: string | string[], userId: UserId): Promise<any> {
    await this.clearDecryptedTagState(userId);
    await this.encryptedTagsState(userId).update((tags) => {
      if (tags == null) {
        return;
      }

      const tagIdsToDelete = Array.isArray(id) ? id : [id];

      tagIdsToDelete.forEach((id) => {
        if (tags[id] != null) {
          delete tags[id];
        }
      });

      return tags;
    });

    // Items in a deleted tag are re-assigned to "No Tag"
    const ciphers = await this.cipherService.getAll(userId);
    if (ciphers != null) {
      const updates: Cipher[] = [];
      for (const cId in ciphers) {
        if (ciphers[cId].tagId === id) {
          ciphers[cId].tagId = null;
          updates.push(ciphers[cId]);
        }
      }
      if (updates.length > 0) {
        await this.cipherService.upsert(updates.map((c) => c.toCipherData()));
      }
    }
  }

  async getRotatedData(
    originalUserKey: UserKey,
    newUserKey: UserKey,
    userId: UserId,
  ): Promise<TagWithIdRequest[]> {
    if (newUserKey == null) {
      throw new Error("New user key is required for rotation.");
    }

    let encryptedTags: TagWithIdRequest[] = [];
    const tags = await firstValueFrom(this.tagViews$(userId));
    if (!tags) {
      return encryptedTags;
    }
    encryptedTags = await Promise.all(
      tags.map(async (tag) => {
        const encryptedTag = await this.encrypt(tag, newUserKey);
        return new TagWithIdRequest(encryptedTag);
      }),
    );
    return encryptedTags;
  }

  /**
   * Decrypts the tags for a user.
   * @param userId the user id
   * @param tagData encrypted tags
   * @returns a list of decrypted tags
   */
  private async decryptTags(userId: UserId, tagData: Record<string, TagData>): Promise<TagView[]> {
    // Check if the decrypted tags are already cached
    const decrypted = await firstValueFrom(
      this.stateProvider.getUser(userId, TAG_DECRYPTED_TAGS).state$,
    );
    if (decrypted?.length) {
      return decrypted;
    }

    if (tagData == null) {
      return [];
    }

    const tags = Object.values(tagData).map((f) => new Tag(f));
    const userKey = await firstValueFrom(this.keyService.userKey$(userId));
    if (!userKey) {
      return [];
    }

    const decryptTagPromises = tags.map((f) => f.decryptWithKey(userKey, this.encryptService));
    const decryptedTags = await Promise.all(decryptTagPromises);
    decryptedTags.sort(Utils.getSortFunction(this.i18nService, "name"));

    const noneTag = new TagView();
    noneTag.name = this.i18nService.t("noneTag");
    decryptedTags.push(noneTag);

    // Cache the decrypted tags
    await this.setDecryptedTags(decryptedTags, userId);
    return decryptedTags;
  }

  /**
   * @returns a SingleUserState for the encrypted tags.
   */
  private encryptedTagsState(userId: UserId) {
    return this.stateProvider.getUser(userId, TAG_ENCRYPTED_TAGS);
  }

  /**
   * Sets the decrypted tags state for a user.
   * @param tags the decrypted tags
   * @param userId the user id
   */
  private async setDecryptedTags(tags: TagView[], userId: UserId): Promise<void> {
    await this.stateProvider.setUserState(TAG_DECRYPTED_TAGS, tags, userId);
  }
}
