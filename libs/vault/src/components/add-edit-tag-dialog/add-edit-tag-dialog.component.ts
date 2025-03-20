import { DIALOG_DATA, DialogRef } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  Inject,
  OnInit,
  ViewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { TagApiServiceAbstraction } from "@bitwarden/common/vault/abstractions/tag/tag-api.service.abstraction";
import { TagService } from "@bitwarden/common/vault/abstractions/tag/tag.service.abstraction";
import { TagView } from "@bitwarden/common/vault/models/view/tag.view";
import {
  AsyncActionsModule,
  BitSubmitDirective,
  ButtonComponent,
  ButtonModule,
  DialogModule,
  DialogService,
  FormFieldModule,
  IconButtonModule,
  ToastService,
} from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

export enum AddEditTagDialogResult {
  Created = "created",
  Deleted = "deleted",
}

export type AddEditTagDialogData = {
  /** When provided, dialog will display edit tag variant */
  editTagConfig?: { tag: TagView };
};

@Component({
  standalone: true,
  selector: "vault-add-edit-tag-dialog",
  templateUrl: "./add-edit-tag-dialog.component.html",
  imports: [
    CommonModule,
    JslibModule,
    DialogModule,
    ButtonModule,
    FormFieldModule,
    ReactiveFormsModule,
    IconButtonModule,
    AsyncActionsModule,
  ],
})
export class AddEditTagDialogComponent implements AfterViewInit, OnInit {
  @ViewChild(BitSubmitDirective) private bitSubmit?: BitSubmitDirective;
  @ViewChild("submitBtn") private submitBtn?: ButtonComponent;

  tag: TagView = new TagView();

  variant: "add" | "edit" = "add";

  tagForm = this.formBuilder.group({
    name: ["", Validators.required],
  });

  private activeUserId$ = this.accountService.activeAccount$.pipe(map((a) => a?.id));
  private destroyRef = inject(DestroyRef);

  constructor(
    private formBuilder: FormBuilder,
    private tagService: TagService,
    private tagApiService: TagApiServiceAbstraction,
    private accountService: AccountService,
    private keyService: KeyService,
    private toastService: ToastService,
    private i18nService: I18nService,
    private logService: LogService,
    private dialogService: DialogService,
    private dialogRef: DialogRef<AddEditTagDialogResult>,
    @Inject(DIALOG_DATA) private data?: AddEditTagDialogData,
  ) {}

  ngOnInit(): void {
    if (this.data?.editTagConfig) {
      this.variant = "edit";
      this.tagForm.controls.name.setValue(this.data.editTagConfig.tag.name);
      this.tag = this.data.editTagConfig.tag;
    } else {
      // Create a new tag view
      this.tag = new TagView();
    }
  }

  ngAfterViewInit(): void {
    this.bitSubmit?.loading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => {
      if (!this.submitBtn) {
        return;
      }

      this.submitBtn.loading.set(loading);
    });
  }

  /** Submit the new tag */
  submit = async () => {
    if (this.tagForm.invalid) {
      return;
    }

    this.tag.name = this.tagForm.controls.name.value ?? "";

    try {
      const activeUserId = await firstValueFrom(this.activeUserId$);
      const userKey = await this.keyService.getUserKeyWithLegacySupport(activeUserId!);
      const tag = await this.tagService.encrypt(this.tag, userKey);
      await this.tagApiService.save(tag, activeUserId!);

      this.toastService.showToast({
        variant: "success",
        title: "",
        message: this.i18nService.t("editedTag"),
      });

      this.close(AddEditTagDialogResult.Created);
    } catch (e) {
      this.logService.error(e);
    }
  };

  /** Delete the tag with when the user provides a confirmation */
  deleteTag = async () => {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "deleteTag" },
      content: { key: "deleteTagPermanently" },
      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      const activeUserId = await firstValueFrom(this.activeUserId$);
      await this.tagApiService.delete(this.tag.id, activeUserId!);
      this.toastService.showToast({
        variant: "success",
        title: "",
        message: this.i18nService.t("deletedTag"),
      });
    } catch (e) {
      this.logService.error(e);
    }

    this.close(AddEditTagDialogResult.Deleted);
  };

  /** Close the dialog */
  private close(result: AddEditTagDialogResult) {
    this.dialogRef.close(result);
  }

  static open(dialogService: DialogService, data?: AddEditTagDialogData) {
    return dialogService.open<AddEditTagDialogResult, AddEditTagDialogData>(
      AddEditTagDialogComponent,
      { data },
    );
  }
}
