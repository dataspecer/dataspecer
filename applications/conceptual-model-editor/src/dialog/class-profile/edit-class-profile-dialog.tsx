import { DialogWrapper, type DialogProps } from "../dialog-api";
import { t } from "../../application";
import { InputLanguageString } from "../components/input-language-string";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { SelectModel } from "../components/select-model";
import { InputIri } from "../components/input-iri";
import { ValidationMessage } from "../components/validation-message";
import { SelectEntities } from "../components/select-entities";
import { ProfiledValueWithSource } from "../components/profiled-value";
import { SpecializationSelect } from "../components/select-specialization";
import { isValid } from "../utilities/validation-utilities";
import { ClassProfileDialogState } from "./edit-class-profile-dialog-state";
import { useClassProfileDialogController } from "./edit-class-profile-dialog-controller";
import { InputText } from "../components/input-text";
import { SelectBuildIn } from "../components/select-build-in";

export const EditClassProfileDialog = (props: DialogProps<ClassProfileDialogState>) => {
  const controller = useClassProfileDialogController(props);
  const state = props.state;
  return (
    <>
      <div
        className="grid gap-y-2 md:grid-cols-[25%_75%] md:gap-y-3 bg-slate-100 md:pb-4 md:pl-8 md:pr-16 md:pt-2"
        style={{ backgroundColor: state.model.color }}>
        <DialogDetailRow detailKey={t("model")}>
          <SelectModel
            language={state.language}
            items={state.availableModels}
            value={state.model}
            onChange={controller.setModel}
            disabled={state.disableModelChange}
          />
        </DialogDetailRow>
      </div>
      <div className="grid bg-slate-100 pb-2 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey={t("modify-class-profile-dialog.profile-of")}>
          <SelectEntities
            language={state.language}
            items={state.availableProfiles}
            value={state.profiles}
            onAdd={controller.addProfile}
            onRemove={controller.removeProfile}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.name")}>
          <ProfiledValueWithSource
            override={state.overrideName}
            onToggleOverride={controller.toggleNameOverride}
            availableProfiles={state.profiles}
            profile={state.nameSource}
            onChangeProfile={controller.setNameSource}
            language={state.language}
            hideProfiling={state.hideNameProfile}
          >
            <InputLanguageString
              value={state.overrideName ? state.name : state.nameSourceValue}
              onChange={controller.setName}
              defaultLanguage={state.language}
              disabled={!state.overrideName}
              inputType="text"
              className="grow"
            />
          </ProfiledValueWithSource>
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.iri")}>
          <InputIri
            iriPrefix={state.model.baseIri ?? ""}
            isRelative={state.isIriRelative}
            setIsRelative={controller.setIsIriRelative}
            value={state.iri}
            onChange={controller.setIri}
          />
          <ValidationMessage value={state.iriValidation} />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("modify-entity-dialog.specialization-of")}>
          <SpecializationSelect
            language={state.language}
            items={state.availableSpecializations}
            specializations={state.specializations}
            addSpecialization={controller.addSpecialization}
            removeSpecialization={controller.removeSpecialization}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.description")}>
          <ProfiledValueWithSource
            override={state.overrideDescription}
            onToggleOverride={controller.toggleDescriptionOverride}
            availableProfiles={state.profiles}
            profile={state.descriptionSource}
            onChangeProfile={controller.setDescriptionSource}
            language={state.language}
            hideProfiling={state.hideDescriptionProfile}
          >
            <InputLanguageString
              value={state.overrideDescription ? state.description : state.descriptionSourceValue}
              onChange={controller.setDescription}
              defaultLanguage={state.language}
              disabled={!state.overrideDescription}
              inputType="textarea"
              className="grow"
            />
          </ProfiledValueWithSource>
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("modify-entity-dialog.usage-note")} >
          <ProfiledValueWithSource
            override={state.overrideUsageNote}
            onToggleOverride={controller.toggleUsageNoteOverride}
            availableProfiles={state.profiles}
            profile={state.usageNoteSource}
            onChangeProfile={controller.setUsageNoteSource}
            language={state.language}
            hideProfiling={state.hideUsageNoteProfile}
          >
            <InputLanguageString
              value={state.overrideUsageNote ? state.usageNote : state.usageNoteSourceValue}
              onChange={controller.setUsageNote}
              defaultLanguage={state.language}
              disabled={!state.overrideUsageNote}
              inputType="textarea"
              className="grow"
            />
          </ProfiledValueWithSource>
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.external-documentation-url")}>
          <InputText
            value={state.externalDocumentationUrl}
            onChange={controller.setExternalDocumentationUrl}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.order")}>
          <InputText
            value={state.order}
            onChange={controller.setOrder}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("create-class-dialog.class-role")}>
          <SelectBuildIn
            items={state.availableRoles}
            value={state.role}
            onChange={controller.setRole}
          />
        </DialogDetailRow>
      </div>
    </>
  );
};

export const createNewClassProfileDialog = (
  state: ClassProfileDialogState,
  onConfirm: (state: ClassProfileDialogState) => void | null,
): DialogWrapper<ClassProfileDialogState> => {
  return {
    label: "dialog.class-profile.label-create",
    component: EditClassProfileDialog,
    state,
    confirmLabel: "dialog.class-profile.ok-create",
    cancelLabel: "dialog.class-profile.cancel",
    validate: (state) => isValid(state.iriValidation),
    onConfirm,
    onClose: null,
  };
};

export const createEditClassProfileDialog = (
  state: ClassProfileDialogState,
  onConfirm: (state: ClassProfileDialogState) => void | null,
): DialogWrapper<ClassProfileDialogState> => {
  return {
    label: "dialog.class-profile.label-edit",
    component: EditClassProfileDialog,
    state,
    confirmLabel: "dialog.class-profile.ok-edit",
    cancelLabel: "dialog.class-profile.cancel",
    validate: (state) => isValid(state.iriValidation),
    onConfirm,
    onClose: null,
  };
};
