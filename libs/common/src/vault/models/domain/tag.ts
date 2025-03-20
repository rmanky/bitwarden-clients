// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Jsonify } from "type-fest";

import { EncryptService } from "../../../key-management/crypto/abstractions/encrypt.service";
import Domain from "../../../platform/models/domain/domain-base";
import { EncString } from "../../../platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { TagData } from "../data/tag.data";
import { TagView } from "../view/tag.view";

export class Test extends Domain {
  id: string;
  name: EncString;
  revisionDate: Date;
}

export class Tag extends Domain {
  id: string;
  name: EncString;
  revisionDate: Date;

  constructor(obj?: TagData) {
    super();
    if (obj == null) {
      return;
    }

    this.buildDomainModel(
      this,
      obj,
      {
        id: null,
        name: null,
      },
      ["id"],
    );

    this.revisionDate = obj.revisionDate != null ? new Date(obj.revisionDate) : null;
  }

  decrypt(): Promise<TagView> {
    return this.decryptObj<Tag, TagView>(this, new TagView(this), ["name"], null);
  }

  async decryptWithKey(key: SymmetricCryptoKey, encryptService: EncryptService): Promise<TagView> {
    const decrypted = await this.decryptObjWithKey(["name"], key, encryptService, Tag);

    const view = new TagView(decrypted);
    view.name = decrypted.name;
    return view;
  }

  static fromJSON(obj: Jsonify<Tag>) {
    const revisionDate = obj.revisionDate == null ? null : new Date(obj.revisionDate);
    return Object.assign(new Tag(), obj, { name: EncString.fromJSON(obj.name), revisionDate });
  }
}
