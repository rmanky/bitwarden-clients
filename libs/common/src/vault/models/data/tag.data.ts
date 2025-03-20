// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Jsonify } from "type-fest";

import { TagResponse } from "../response/tag.response";

export class TagData {
  id: string;
  name: string;
  revisionDate: string;

  constructor(response: Partial<TagResponse>) {
    this.name = response?.name;
    this.id = response?.id;
    this.revisionDate = response?.revisionDate;
  }

  static fromJSON(obj: Jsonify<TagData>) {
    return Object.assign(new TagData({}), obj);
  }
}
