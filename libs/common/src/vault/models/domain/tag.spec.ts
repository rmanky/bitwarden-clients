import { mock, MockProxy } from "jest-mock-extended";

import { makeEncString, makeSymmetricCryptoKey, mockEnc, mockFromJson } from "../../../../spec";
import { EncryptService } from "../../../key-management/crypto/abstractions/encrypt.service";
import { EncryptedString, EncString } from "../../../platform/models/domain/enc-string";
import { TagData } from "../../models/data/tag.data";
import { Tag } from "../../models/domain/tag";

describe("Tag", () => {
  let data: TagData;

  beforeEach(() => {
    data = {
      id: "id",
      name: "encName",
      revisionDate: "2022-01-31T12:00:00.000Z",
    };
  });

  it("Convert", () => {
    const field = new Tag(data);

    expect(field).toEqual({
      id: "id",
      name: { encryptedString: "encName", encryptionType: 0 },
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });

  it("Decrypt", async () => {
    const tag = new Tag();
    tag.id = "id";
    tag.name = mockEnc("encName");
    tag.revisionDate = new Date("2022-01-31T12:00:00.000Z");

    const view = await tag.decrypt();

    expect(view).toEqual({
      id: "id",
      name: "encName",
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });

  describe("fromJSON", () => {
    jest.mock("../../../platform/models/domain/enc-string");
    jest.spyOn(EncString, "fromJSON").mockImplementation(mockFromJson);

    it("initializes nested objects", () => {
      const revisionDate = new Date("2022-08-04T01:06:40.441Z");
      const actual = Tag.fromJSON({
        revisionDate: revisionDate.toISOString(),
        name: "name" as EncryptedString,
        id: "id",
      });

      const expected = {
        revisionDate: revisionDate,
        name: "name_fromJSON",
        id: "id",
      };

      expect(actual).toMatchObject(expected);
    });
  });

  describe("decryptWithKey", () => {
    let encryptService: MockProxy<EncryptService>;
    const key = makeSymmetricCryptoKey(64);

    beforeEach(() => {
      encryptService = mock<EncryptService>();
      encryptService.decryptToUtf8.mockImplementation((value) => {
        return Promise.resolve(value.data);
      });
    });

    it("decrypts the name", async () => {
      const tag = new Tag();
      tag.name = makeEncString("encName");

      const view = await tag.decryptWithKey(key, encryptService);

      expect(view).toEqual({
        name: "encName",
      });
    });

    it("assigns the tag id and revision date", async () => {
      const tag = new Tag();
      tag.id = "id";
      tag.revisionDate = new Date("2022-01-31T12:00:00.000Z");

      const view = await tag.decryptWithKey(key, encryptService);

      expect(view).toEqual(
        expect.objectContaining({
          id: "id",
          revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        }),
      );
    });
  });
});
