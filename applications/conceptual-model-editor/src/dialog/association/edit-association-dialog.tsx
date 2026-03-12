import { DialogWrapper, type DialogProps } from "../dialog-api";
import { configuration, t } from "../../application";
import { InputLanguageString } from "../components/input-language-string";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { SelectModel } from "../components/select-model";
import { SelectEntity } from "../components/select-entity";
import { SelectCardinality } from "../components/select-cardinality";
import { InputIri } from "../components/input-iri";
import { ValidationMessage } from "../components/validation-message";
import { isValid } from "../utilities/validation-utilities";
import { AssociationDialogState } from "./edit-association-dialog-state";
import { useAssociationDialogController } from "./edit-association-dialog-controller";
import { SpecializationSelect } from "../components/select-specialization";
import { InputText } from "../components/input-text";

export const EditAssociationDialog = (props: DialogProps<AssociationDialogState>) => {
  const controller = useAssociationDialogController(props);
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
        <DialogDetailRow detailKey={t("create-class-dialog.name")} className="text-xl">
          <InputLanguageString
            value={state.name}
            onChange={controller.setName}
            defaultLanguage={state.language}
            inputType="text"
            autoFocus
          />
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
          <InputLanguageString
            value={state.description}
            onChange={controller.setDescription}
            defaultLanguage={state.language}
            inputType="textarea"
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("domain")}>
          <SelectEntity
            language={state.language}
            items={state.availableDomains}
            value={state.domain}
            onChange={controller.setDomain}
          />
          <ValidationMessage value={state.domainValidation} />
        </DialogDetailRow>
        {configuration().hideRelationCardinality ? null :
          <DialogDetailRow detailKey={t("domain-cardinality")}>
            <SelectCardinality
              items={state.availableCardinalities}
              value={state.domainCardinality}
              onChange={controller.setDomainCardinality}
            />
          </DialogDetailRow>
        }
        <DialogDetailRow detailKey={t("range")}>
          <SelectEntity
            language={state.language}
            items={state.availableRanges}
            value={state.range}
            onChange={controller.setRange}
          />
          <ValidationMessage value={state.rangeValidation} />
        </DialogDetailRow>
        {configuration().hideRelationCardinality ? null :
          <DialogDetailRow detailKey={t("range-cardinality")}>
            <SelectCardinality
              items={state.availableCardinalities}
              value={state.rangeCardinality}
              onChange={controller.setRangeCardinality}
            />
          </DialogDetailRow>
        }
        <DialogDetailRow detailKey={t("create-class-dialog.external-documentation-url")}>
          <InputText
            value={state.externalDocumentationUrl}
            onChange={controller.setExternalDocumentationUrl}
          />
        </DialogDetailRow>
      </div>
    </>
  );
};

export const createNewAssociationDialog = (
  state: AssociationDialogState,
  onConfirm: (state: AssociationDialogState) => void,
): DialogWrapper<AssociationDialogState> => {
  return {
    label: "dialog.association.label-create",
    component: EditAssociationDialog,
    state,
    confirmLabel: "dialog.association.ok-create",
    cancelLabel: "dialog.association.cancel",
    validate: (state) => isValid(state.iriValidation)
      && isValid(state.domainValidation)
      && isValid(state.rangeValidation),
    onConfirm: onConfirm,
    onClose: null,
  };
}

export const createEditAssociationDialog = (
  state: AssociationDialogState,
  onConfirm: (state: AssociationDialogState) => void,
): DialogWrapper<AssociationDialogState> => {
  return {
    label: "dialog.association.label-edit",
    component: EditAssociationDialog,
    state,
    confirmLabel: "dialog.association.ok-edit",
    cancelLabel: "dialog.association.cancel",
    validate: (state) => isValid(state.iriValidation)
      && isValid(state.domainValidation)
      && isValid(state.rangeValidation),
    onConfirm: onConfirm,
    onClose: null,
  };
}
