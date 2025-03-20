import { TAG_DECRYPTED_TAGS, TAG_ENCRYPTED_TAGS } from "./tag.state";

describe("encrypted tags", () => {
  const sut = TAG_ENCRYPTED_TAGS;

  it("should deserialize encrypted tags", async () => {
    const inputObj = {
      id: {
        id: "id",
        name: "encName",
        revisionDate: "2024-01-31T12:00:00.000Z",
      },
    };

    const expectedTagData = {
      id: { id: "id", name: "encName", revisionDate: "2024-01-31T12:00:00.000Z" },
    };

    const result = sut.deserializer(JSON.parse(JSON.stringify(inputObj)));

    expect(result).toEqual(expectedTagData);
  });
});

describe("derived decrypted tags", () => {
  const sut = TAG_DECRYPTED_TAGS;

  it("should deserialize decrypted tags", async () => {
    const inputObj = [
      {
        id: "id",
        name: "encName",
        revisionDate: "2024-01-31T12:00:00.000Z",
      },
    ];

    const expectedTagView = [
      {
        id: "id",
        name: "encName",
        revisionDate: new Date("2024-01-31T12:00:00.000Z"),
      },
    ];

    const result = sut.deserializer(JSON.parse(JSON.stringify(inputObj)));

    expect(result).toEqual(expectedTagView);
  });

  it("should handle null input", async () => {
    const result = sut.deserializer(null);
    expect(result).toEqual([]);
  });
});
