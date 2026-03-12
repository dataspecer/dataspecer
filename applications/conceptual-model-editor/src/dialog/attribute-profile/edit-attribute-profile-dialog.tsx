import { DialogWrapper, type DialogProps } from "../dialog-api";
import { t } from "../../application";
import { InputLanguageString } from "../components/input-language-string";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { SelectModel } from "../components/select-model";
import { SelectEntity } from "../components/select-entity";
import { SelectCardinality } from "../components/select-cardinality";
import { InputIri } from "../components/input-iri";
import { ValidationMessage } from "../components/validation-message";
import { SelectDataType } from "../components/select-data-type";
import { SelectEntities } from "../components/select-entities";
import { ProfiledValue, ProfiledValueWithSource } from "../components/profiled-value";
import { AttributeProfileDialogState } from "./edit-attribute-profile-dialog-state";
import { isValid } from "../utilities/validation-utilities";
import { useAttributeProfileDialogController } from "./edit-attribute-profile-dialog-controller";
import { SpecializationSelect } from "../components/select-specialization";
import { InputText } from "../components/input-text";
import { SelectBuildIn } from "../components/select-build-in";

export const EditAttributeProfileDialog = (props: DialogProps<AttributeProfileDialogState>) => {
  const controller = useAttributeProfileDialogController(props);
  const state = props.state;
  return (
    <>
      <div
        className="grid gap-y-2 md:grid-cols-[25%_75%] md:gap-y-3 bg-slate-100 md:pb-4 md:pl-8 md:pr-16 md:pt-2"
        style={{ backgroundColor: state.model.color }}
      >
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
            disableRemove={state.profiles.length === 1}
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
        <DialogDetailRow detailKey={"Domain"}>
          <SelectEntity
            language={state.language}
            items={state.availableDomains}
            value={state.domain}
            onChange={controller.setDomain}
          />
          <ValidationMessage value={state.domainValidation} />
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
            hideProfiling={state.hideUsageNoteProfile}
            language={state.language}
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
        {/*  */}
        <DialogDetailRow detailKey={"Domain cardinality"}>
          <ProfiledValue
            override={state.overrideDomainCardinality}
            onToggleOverride={controller.toggleDomainCardinalityOverride}
            language={state.language}
          >
            <SelectCardinality
              items={state.availableCardinalities}
              value={state.domainCardinality}
              onChange={controller.setDomainCardinality}
              disabled={!state.overrideDomainCardinality}
            />
          </ProfiledValue>
          <ValidationMessage value={state.domainCardinalityValidation} />
        </DialogDetailRow>
        <DialogDetailRow detailKey={"Range"}>
          <SelectDataType
            language={state.language}
            items={state.availableRanges}
            value={state.range}
            onChange={controller.setRange}
          />
          <ValidationMessage value={state.rangeValidation} />
        </DialogDetailRow>
        <DialogDetailRow detailKey={"Range cardinality"}>
          <ProfiledValue
            override={state.overrideRangeCardinality}
            onToggleOverride={controller.toggleRangeCardinalityOverride}
            language={state.language}
          >
            <SelectCardinality
              items={state.availableCardinalities}
              value={state.rangeCardinality}
              onChange={controller.setRangeCardinality}
              disabled={!state.overrideRangeCardinality}
            />
          </ProfiledValue>
          <ValidationMessage value={state.rangeCardinalityValidation} />
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
        <DialogDetailRow detailKey={t("relationship-profile.mandatory-level")}>
          <SelectBuildIn
            items={state.availableMandatoryLevels}
            value={state.mandatoryLevel}
            onChange={controller.setMandatoryLevel}
          />
        </DialogDetailRow>
      </div>
    </>
  );
};

export const createNewAttributeProfileDialog = (
  state: AttributeProfileDialogState,
  onConfirm: (state: AttributeProfileDialogState) => void,
): DialogWrapper<AttributeProfileDialogState> => {
  return {
    label: "dialog.attribute-profile.label-create",
    component: EditAttributeProfileDialog,
    state,
    confirmLabel: "dialog.attribute-profile.ok-create",
    cancelLabel: "dialog.attribute-profile.cancel",
    validate: (state) => isValid(state.iriValidation)
      && isValid(state.domainValidation)
      && isValid(state.rangeValidation),
    onConfirm: onConfirm,
    onClose: null,
  };
}

export const createEditAttributeProfileDialog = (
  state: AttributeProfileDialogState,
  onConfirm: (state: AttributeProfileDialogState) => void,
): DialogWrapper<AttributeProfileDialogState> => {
  return {
    label: "dialog.attribute-profile.label-edit",
    component: EditAttributeProfileDialog,
    state,
    confirmLabel: "dialog.attribute-profile.ok-edit",
    cancelLabel: "dialog.attribute-profile.cancel",
    validate: (state) => isValid(state.iriValidation)
      && isValid(state.domainValidation)
      && isValid(state.rangeValidation),
    onConfirm: onConfirm,
    onClose: null,
  };
}

export const createAddAttributeProfileDialog = (
  state: AttributeProfileDialogState,
  onConfirm: (state: AttributeProfileDialogState) => void,
): DialogWrapper<AttributeProfileDialogState> => {
  return {
    label: "dialog.attribute-profile.label-create",
    component: EditAttributeProfileDialog,
    state,
    confirmLabel: "dialog.attribute-profile.ok-create",
    cancelLabel: "dialog.attribute-profile.cancel",
    validate: (state) => isValid(state.iriValidation)
      && isValid(state.domainValidation)
      && isValid(state.rangeValidation),
    onConfirm: onConfirm,
    onClose: null,
  };
}
