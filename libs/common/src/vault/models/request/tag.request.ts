// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Tag } from "../domain/tag";

export class TagRequest {
  name: string;

  constructor(tag: Tag) {
    this.name = tag.name ? tag.name.encryptedString : null;
  }
}
