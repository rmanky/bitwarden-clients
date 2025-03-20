import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject, firstValueFrom } from "rxjs";

import { KeyService } from "@bitwarden/key-management";

import { makeEncString } from "../../../../spec";
import { FakeAccountService, mockAccountServiceWith } from "../../../../spec/fake-account-service";
import { FakeSingleUserState } from "../../../../spec/fake-state";
import { FakeStateProvider } from "../../../../spec/fake-state-provider";
import { EncryptService } from "../../../key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "../../../platform/abstractions/i18n.service";
import { Utils } from "../../../platform/misc/utils";
import { EncString } from "../../../platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { UserId } from "../../../types/guid";
import { UserKey } from "../../../types/key";
import { CipherService } from "../../abstractions/cipher.service";
import { TagData } from "../../models/data/tag.data";
import { TagView } from "../../models/view/tag.view";
import { TagService } from "../../services/tag/tag.service";
import { TAG_DECRYPTED_TAGS, TAG_ENCRYPTED_TAGS } from "../key-state/tag.state";

describe("Tag Service", () => {
  let tagService: TagService;

  let keyService: MockProxy<KeyService>;
  let encryptService: MockProxy<EncryptService>;
  let i18nService: MockProxy<I18nService>;
  let cipherService: MockProxy<CipherService>;
  let stateProvider: FakeStateProvider;

  const mockUserId = Utils.newGuid() as UserId;
  let accountService: FakeAccountService;
  let tagState: FakeSingleUserState<Record<string, TagData>>;

  beforeEach(() => {
    keyService = mock<KeyService>();
    encryptService = mock<EncryptService>();
    i18nService = mock<I18nService>();
    cipherService = mock<CipherService>();

    accountService = mockAccountServiceWith(mockUserId);
    stateProvider = new FakeStateProvider(accountService);

    i18nService.collator = new Intl.Collator("en");
    i18nService.t.mockReturnValue("No Tag");

    keyService.userKey$.mockReturnValue(new BehaviorSubject("mockOriginalUserKey" as any));
    encryptService.decryptToUtf8.mockResolvedValue("DEC");

    tagService = new TagService(
      keyService,
      encryptService,
      i18nService,
      cipherService,
      stateProvider,
    );

    tagState = stateProvider.singleUser.getFake(mockUserId, TAG_ENCRYPTED_TAGS);

    // Initial state
    tagState.nextState({ "1": tagData("1") });
  });

  describe("tags$", () => {
    it("emits encrypted tags from state", async () => {
      const tag1 = tagData("1");
      const tag2 = tagData("2");

      await stateProvider.setUserState(
        TAG_ENCRYPTED_TAGS,
        Object.fromEntries([tag1, tag2].map((f) => [f.id, f])),
        mockUserId,
      );

      const result = await firstValueFrom(tagService.tags$(mockUserId));

      expect(result.length).toBe(2);
      expect(result).toContainPartialObjects([
        { id: "1", name: makeEncString("ENC_STRING_1") },
        { id: "2", name: makeEncString("ENC_STRING_2") },
      ]);
    });
  });

  describe("tagView$", () => {
    it("emits decrypted tags from state", async () => {
      const tag1 = tagData("1");
      const tag2 = tagData("2");

      await stateProvider.setUserState(
        TAG_ENCRYPTED_TAGS,
        Object.fromEntries([tag1, tag2].map((f) => [f.id, f])),
        mockUserId,
      );

      const result = await firstValueFrom(tagService.tagViews$(mockUserId));

      expect(result.length).toBe(3);
      expect(result).toContainPartialObjects([
        { id: "1", name: "DEC" },
        { id: "2", name: "DEC" },
        { name: "No Tag" },
      ]);
    });
  });

  it("encrypt", async () => {
    const model = new TagView();
    model.id = "2";
    model.name = "Test Tag";

    encryptService.encrypt.mockResolvedValue(new EncString("ENC"));

    const result = await tagService.encrypt(model, null);

    expect(result).toEqual({
      id: "2",
      name: {
        encryptedString: "ENC",
        encryptionType: 0,
      },
    });
  });

  describe("get", () => {
    it("exists", async () => {
      const result = await tagService.get("1", mockUserId);

      expect(result).toEqual({
        id: "1",
        name: makeEncString("ENC_STRING_" + 1),
        revisionDate: null,
      });
    });

    it("not exists", async () => {
      const result = await tagService.get("2", mockUserId);

      expect(result).toBe(undefined);
    });
  });

  it("upsert", async () => {
    await tagService.upsert(tagData("2"), mockUserId);

    expect(await firstValueFrom(tagService.tags$(mockUserId))).toEqual([
      {
        id: "1",
        name: makeEncString("ENC_STRING_" + 1),
        revisionDate: null,
      },
      {
        id: "2",
        name: makeEncString("ENC_STRING_" + 2),
        revisionDate: null,
      },
    ]);
  });

  it("replace", async () => {
    await tagService.replace({ "4": tagData("4") }, mockUserId);

    expect(await firstValueFrom(tagService.tags$(mockUserId))).toEqual([
      {
        id: "4",
        name: makeEncString("ENC_STRING_" + 4),
        revisionDate: null,
      },
    ]);
  });

  it("delete", async () => {
    await tagService.delete("1", mockUserId);

    expect((await firstValueFrom(tagService.tags$(mockUserId))).length).toBe(0);
  });

  describe("clearDecryptedTagState", () => {
    it("null userId", async () => {
      await expect(tagService.clearDecryptedTagState(null)).rejects.toThrow("User ID is required.");
    });

    it("userId provided", async () => {
      await tagService.clearDecryptedTagState(mockUserId);

      expect((await firstValueFrom(tagService.tags$(mockUserId))).length).toBe(1);
      expect(
        (await firstValueFrom(stateProvider.getUserState$(TAG_DECRYPTED_TAGS, mockUserId))).length,
      ).toBe(0);
    });
  });

  it("clear", async () => {
    await tagService.clear(mockUserId);

    expect((await firstValueFrom(tagService.tags$(mockUserId))).length).toBe(0);

    const tagViews = await firstValueFrom(tagService.tagViews$(mockUserId));
    expect(tagViews.length).toBe(1);
    expect(tagViews[0].id).toBeNull(); // Should be the "No Tag" tag
  });

  describe("getRotatedData", () => {
    const originalUserKey = new SymmetricCryptoKey(new Uint8Array(32)) as UserKey;
    const newUserKey = new SymmetricCryptoKey(new Uint8Array(32)) as UserKey;
    let encryptedKey: EncString;

    beforeEach(() => {
      encryptedKey = new EncString("Re-encrypted Tag");
      encryptService.encrypt.mockResolvedValue(encryptedKey);
    });

    it("returns re-encrypted user tags", async () => {
      const result = await tagService.getRotatedData(originalUserKey, newUserKey, mockUserId);

      expect(result[0]).toMatchObject({ id: "1", name: "Re-encrypted Tag" });
    });

    it("throws if the new user key is null", async () => {
      await expect(tagService.getRotatedData(originalUserKey, null, mockUserId)).rejects.toThrow(
        "New user key is required for rotation.",
      );
    });
  });

  function tagData(id: string) {
    const data = new TagData({} as any);
    data.id = id;
    data.name = makeEncString("ENC_STRING_" + data.id).encryptedString;

    return data;
  }
});
