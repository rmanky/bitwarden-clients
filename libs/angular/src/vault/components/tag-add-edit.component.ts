// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Directive, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Validators, FormBuilder } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { TagApiServiceAbstraction } from "@bitwarden/common/vault/abstractions/tag/tag-api.service.abstraction";
import { TagService } from "@bitwarden/common/vault/abstractions/tag/tag.service.abstraction";
import { TagView } from "@bitwarden/common/vault/models/view/tag.view";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

@Directive()
export class TagAddEditComponent implements OnInit {
  @Input() tagId: string;
  @Output() onSavedTag = new EventEmitter<TagView>();
  @Output() onDeletedTag = new EventEmitter<TagView>();

  editMode = false;
  tag: TagView = new TagView();
  title: string;
  formPromise: Promise<any>;
  deletePromise: Promise<any>;
  protected componentName = "";

  protected activeUserId$ = this.accountService.activeAccount$.pipe(map((a) => a?.id));

  formGroup = this.formBuilder.group({
    name: ["", [Validators.required]],
  });

  constructor(
    protected tagService: TagService,
    protected tagApiService: TagApiServiceAbstraction,
    protected accountService: AccountService,
    protected keyService: KeyService,
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected logService: LogService,
    protected dialogService: DialogService,
    protected formBuilder: FormBuilder,
    protected toastService: ToastService,
  ) {}

  async ngOnInit() {
    await this.init();
  }

  async submit(): Promise<boolean> {
    this.tag.name = this.formGroup.controls.name.value;
    if (this.tag.name == null || this.tag.name === "") {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("nameRequired"),
      });
      return false;
    }

    try {
      const activeUserId = await firstValueFrom(this.activeUserId$);
      const userKey = await this.keyService.getUserKeyWithLegacySupport(activeUserId);
      const tag = await this.tagService.encrypt(this.tag, userKey);
      this.formPromise = this.tagApiService.save(tag, activeUserId);
      await this.formPromise;
      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.i18nService.t(this.editMode ? "editedTag" : "addedTag"),
      });
      this.onSavedTag.emit(this.tag);
      return true;
    } catch (e) {
      this.logService.error(e);
    }

    return false;
  }

  async delete(): Promise<boolean> {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "deleteTag" },
      content: { key: "deleteTagConfirmation" },
      type: "warning",
    });

    if (!confirmed) {
      return false;
    }

    try {
      const activeUserId = await firstValueFrom(this.activeUserId$);
      this.deletePromise = this.tagApiService.delete(this.tag.id, activeUserId);
      await this.deletePromise;
      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.i18nService.t("deletedTag"),
      });
      this.onDeletedTag.emit(this.tag);
    } catch (e) {
      this.logService.error(e);
    }

    return true;
  }

  protected async init() {
    this.editMode = this.tagId != null;

    if (this.editMode) {
      this.editMode = true;
      this.title = this.i18nService.t("editTag");
      const activeUserId = await firstValueFrom(this.activeUserId$);
      this.tag = await firstValueFrom(this.tagService.getDecrypted$(this.tagId, activeUserId));
    } else {
      this.title = this.i18nService.t("addTag");
    }
    this.formGroup.controls.name.setValue(this.tag.name);
  }
}
