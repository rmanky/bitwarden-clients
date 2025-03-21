import { Component } from "@angular/core";

import { AttachmentsComponent as BaseAttachmentsComponent } from "@bitwarden/angular/vault/components/attachments.component";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { FileDownloadService } from "@bitwarden/common/platform/abstractions/file-download/file-download.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

@Component({
  selector: "emergency-access-attachments",
  templateUrl: "../../../../vault/individual-vault/attachments.component.html",
})
export class EmergencyAccessAttachmentsComponent extends BaseAttachmentsComponent {
  viewOnly = true;
  canAccessAttachments = true;

  constructor(
    cipherService: CipherService,
    i18nService: I18nService,
    keyService: KeyService,
    encryptService: EncryptService,
    stateService: StateService,
    platformUtilsService: PlatformUtilsService,
    apiService: ApiService,
    logService: LogService,
    fileDownloadService: FileDownloadService,
    dialogService: DialogService,
    billingAccountProfileStateService: BillingAccountProfileStateService,
    accountService: AccountService,
    toastService: ToastService,
  ) {
    super(
      cipherService,
      i18nService,
      keyService,
      encryptService,
      platformUtilsService,
      apiService,
      window,
      logService,
      stateService,
      fileDownloadService,
      dialogService,
      billingAccountProfileStateService,
      accountService,
      toastService,
    );
  }

  protected async init() {
    // Do nothing since cipher is already decoded
  }

  protected showFixOldAttachments(attachment: AttachmentView) {
    return false;
  }
}
