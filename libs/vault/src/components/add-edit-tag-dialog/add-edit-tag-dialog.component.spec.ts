import { DIALOG_DATA, DialogRef } from "@angular/cdk/dialog";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject } from "rxjs";

import { AccountInfo, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { UserId } from "@bitwarden/common/types/guid";
import { TagApiServiceAbstraction } from "@bitwarden/common/vault/abstractions/tag/tag-api.service.abstraction";
import { TagService } from "@bitwarden/common/vault/abstractions/tag/tag.service.abstraction";
import { Tag } from "@bitwarden/common/vault/models/domain/tag";
import { TagView } from "@bitwarden/common/vault/models/view/tag.view";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

import {
  AddEditTagDialogComponent,
  AddEditTagDialogData,
  AddEditTagDialogResult,
} from "./add-edit-tag-dialog.component";

describe("AddEditTagDialogComponent", () => {
  let component: AddEditTagDialogComponent;
  let fixture: ComponentFixture<AddEditTagDialogComponent>;

  const dialogData = {} as AddEditTagDialogData;
  const tag = new Tag();
  const encrypt = jest.fn().mockResolvedValue(tag);
  const save = jest.fn().mockResolvedValue(null);
  const deleteTag = jest.fn().mockResolvedValue(null);
  const openSimpleDialog = jest.fn().mockResolvedValue(true);
  const getUserKeyWithLegacySupport = jest.fn().mockResolvedValue("");
  const error = jest.fn();
  const close = jest.fn();
  const showToast = jest.fn();

  const dialogRef = {
    close,
  };

  beforeEach(async () => {
    encrypt.mockClear();
    save.mockClear();
    deleteTag.mockClear();
    error.mockClear();
    close.mockClear();
    showToast.mockClear();

    const userId = "" as UserId;
    const accountInfo: AccountInfo = {
      email: "",
      emailVerified: true,
      name: undefined,
    };

    await TestBed.configureTestingModule({
      imports: [AddEditTagDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: I18nService, useValue: { t: (key: string) => key } },
        { provide: TagService, useValue: { encrypt } },
        { provide: TagApiServiceAbstraction, useValue: { save, delete: deleteTag } },
        {
          provide: AccountService,
          useValue: { activeAccount$: new BehaviorSubject({ id: userId, ...accountInfo }) },
        },
        {
          provide: KeyService,
          useValue: {
            getUserKeyWithLegacySupport,
          },
        },
        { provide: LogService, useValue: { error } },
        { provide: ToastService, useValue: { showToast } },
        { provide: DIALOG_DATA, useValue: dialogData },
        { provide: DialogRef, useValue: dialogRef },
      ],
    })
      .overrideProvider(DialogService, { useValue: { openSimpleDialog } })
      .compileComponents();

    fixture = TestBed.createComponent(AddEditTagDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe("new tag", () => {
    it("requires a tag name", async () => {
      await component.submit();

      expect(encrypt).not.toHaveBeenCalled();

      component.tagForm.controls.name.setValue("New Tag");

      await component.submit();

      expect(encrypt).toHaveBeenCalled();
    });

    it("submits a new tag view", async () => {
      component.tagForm.controls.name.setValue("New Tag");

      await component.submit();

      const newTag = new TagView();
      newTag.name = "New Tag";

      expect(encrypt).toHaveBeenCalledWith(newTag, "");
      expect(save).toHaveBeenCalled();
    });

    it("shows success toast after saving", async () => {
      component.tagForm.controls.name.setValue("New Tag");

      await component.submit();

      expect(showToast).toHaveBeenCalledWith({
        message: "editedTag",
        title: "",
        variant: "success",
      });
    });

    it("closes the dialog after saving", async () => {
      component.tagForm.controls.name.setValue("New Tag");

      await component.submit();

      expect(close).toHaveBeenCalledWith(AddEditTagDialogResult.Created);
    });

    it("logs error if saving fails", async () => {
      const errorObj = new Error("Failed to save tag");
      save.mockRejectedValue(errorObj);

      component.tagForm.controls.name.setValue("New Tag");

      await component.submit();

      expect(error).toHaveBeenCalledWith(errorObj);
    });
  });

  describe("editing tag", () => {
    const tagView = new TagView();
    tagView.id = "1";
    tagView.name = "Tag 1";

    beforeEach(() => {
      dialogData.editTagConfig = { tag: tagView };

      component.ngOnInit();
    });

    it("populates form with tag name", () => {
      expect(component.tagForm.controls.name.value).toBe("Tag 1");
    });

    it("submits the updated tag", async () => {
      component.tagForm.controls.name.setValue("Edited Tag");
      await component.submit();

      expect(encrypt).toHaveBeenCalledWith(
        {
          ...dialogData.editTagConfig!.tag,
          name: "Edited Tag",
        },
        "",
      );
    });

    it("deletes the tag", async () => {
      await component.deleteTag();

      expect(deleteTag).toHaveBeenCalledWith(tagView.id, "");
      expect(showToast).toHaveBeenCalledWith({
        variant: "success",
        title: "",
        message: "deletedTag",
      });
      expect(close).toHaveBeenCalledWith(AddEditTagDialogResult.Deleted);
    });
  });
});
