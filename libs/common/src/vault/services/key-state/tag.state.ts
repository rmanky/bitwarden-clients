import { Jsonify } from "type-fest";

import { TAG_DISK, TAG_MEMORY, UserKeyDefinition } from "../../../platform/state";
import { TagData } from "../../models/data/tag.data";
import { TagView } from "../../models/view/tag.view";

export const TAG_ENCRYPTED_TAGS = UserKeyDefinition.record<TagData>(TAG_DISK, "tags", {
  deserializer: (obj: Jsonify<TagData>) => TagData.fromJSON(obj),
  clearOn: ["logout"],
});

export const TAG_DECRYPTED_TAGS = new UserKeyDefinition<TagView[]>(TAG_MEMORY, "decryptedTags", {
  deserializer: (obj: Jsonify<TagView[]>) => obj?.map((f) => TagView.fromJSON(f)) ?? [],
  clearOn: ["logout", "lock"],
});
