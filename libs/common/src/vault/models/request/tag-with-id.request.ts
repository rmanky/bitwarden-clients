import { Tag } from "../domain/tag";

import { TagRequest } from "./tag.request";

export class TagWithIdRequest extends TagRequest {
  id: string;

  constructor(tag: Tag) {
    super(tag);
    this.id = tag.id;
  }
}
