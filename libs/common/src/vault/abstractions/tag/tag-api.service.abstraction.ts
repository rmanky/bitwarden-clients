// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore

import { UserId } from "../../../types/guid";
import { TagData } from "../../models/data/tag.data";
import { Tag } from "../../models/domain/tag";
import { TagResponse } from "../../models/response/tag.response";

export class TagApiServiceAbstraction {
  save: (tag: Tag, userId: UserId) => Promise<TagData>;
  delete: (id: string, userId: UserId) => Promise<any>;
  get: (id: string) => Promise<TagResponse>;
  deleteAll: (userId: UserId) => Promise<void>;
}
