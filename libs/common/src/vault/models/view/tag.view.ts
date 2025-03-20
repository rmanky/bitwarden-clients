// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Jsonify } from "type-fest";

import { View } from "../../../models/view/view";
import { DecryptedObject } from "../../../platform/models/domain/domain-base";
import { Tag } from "../domain/tag";
import { ITreeNodeObject } from "../domain/tree-node";

export class TagView implements View, ITreeNodeObject {
  id: string = null;
  name: string = null;
  revisionDate: Date = null;

  constructor(f?: Tag | DecryptedObject<Tag, "name">) {
    if (!f) {
      return;
    }

    this.id = f.id;
    this.revisionDate = f.revisionDate;
  }

  static fromJSON(obj: Jsonify<TagView>) {
    const revisionDate = obj.revisionDate == null ? null : new Date(obj.revisionDate);
    return Object.assign(new TagView(), obj, { revisionDate });
  }
}
