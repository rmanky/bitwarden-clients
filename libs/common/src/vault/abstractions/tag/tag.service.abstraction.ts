// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Observable } from "rxjs";

import { UserKeyRotationDataProvider } from "@bitwarden/key-management";

import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { UserId } from "../../../types/guid";
import { UserKey } from "../../../types/key";
import { TagData } from "../../models/data/tag.data";
import { Tag } from "../../models/domain/tag";
import { TagWithIdRequest } from "../../models/request/tag-with-id.request";
import { TagView } from "../../models/view/tag.view";

export abstract class TagService implements UserKeyRotationDataProvider<TagWithIdRequest> {
  tags$: (userId: UserId) => Observable<Tag[]>;
  tagViews$: (userId: UserId) => Observable<TagView[]>;

  clearDecryptedTagState: (userId: UserId) => Promise<void>;
  encrypt: (model: TagView, key: SymmetricCryptoKey) => Promise<Tag>;
  get: (id: string, userId: UserId) => Promise<Tag>;
  getDecrypted$: (id: string, userId: UserId) => Observable<TagView | undefined>;
  /**
   * @deprecated Use firstValueFrom(tags$) directly instead
   * @param userId The user id
   * @returns Promise of tags array
   */
  getAllFromState: (userId: UserId) => Promise<Tag[]>;
  /**
   * @deprecated Only use in CLI!
   */
  getFromState: (id: string, userId: UserId) => Promise<Tag>;
  /**
   * @deprecated Only use in CLI!
   */
  getAllDecryptedFromState: (userId: UserId) => Promise<TagView[]>;
  /**
   * Returns user tags re-encrypted with the new user key.
   * @param originalUserKey the original user key
   * @param newUserKey the new user key
   * @param userId the user id
   * @throws Error if new user key is null
   * @returns a list of user tags that have been re-encrypted with the new user key
   */
  getRotatedData: (
    originalUserKey: UserKey,
    newUserKey: UserKey,
    userId: UserId,
  ) => Promise<TagWithIdRequest[]>;
}

export abstract class InternalTagService extends TagService {
  upsert: (tag: TagData | TagData[], userId: UserId) => Promise<void>;
  replace: (tags: { [id: string]: TagData }, userId: UserId) => Promise<void>;
  clear: (userId: UserId) => Promise<void>;
  delete: (id: string | string[], userId: UserId) => Promise<any>;
}
