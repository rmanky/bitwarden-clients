import { Component } from "@angular/core";
import { FormBuilder } from "@angular/forms";

import { TagAddEditComponent as BaseTagAddEditComponent } from "@bitwarden/angular/vault/components/tag-add-edit.component";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { TagApiServiceAbstraction } from "@bitwarden/common/vault/abstractions/tag/tag-api.service.abstraction";
import { TagService } from "@bitwarden/common/vault/abstractions/tag/tag.service.abstraction";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

@Component({
  selector: "app-tag-add-edit",
  templateUrl: "tag-add-edit.component.html",
})
export class TagAddEditComponent extends BaseTagAddEditComponent {
  constructor(
    tagService: TagService,
    tagApiService: TagApiServiceAbstraction,
    accountService: AccountService,
    keyService: KeyService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService,
    logService: LogService,
    dialogService: DialogService,
    formBuilder: FormBuilder,
    toastService: ToastService,
  ) {
    super(
      tagService,
      tagApiService,
      accountService,
      keyService,
      i18nService,
      platformUtilsService,
      logService,
      dialogService,
      formBuilder,
      toastService,
    );
  }
}
