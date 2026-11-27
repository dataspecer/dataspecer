// Component for AttributeProfileCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { LanguageStringInput } from "../../components/language-string-input";
import { SelectEntity } from "../../components/select-entity";
import { IriInput } from "../../components/iri-input";
import { SelectCardinality } from "../../components/select-cardinality";
import { StringInput } from "../../components/string-input";
import { AttributeProfileCreateDialogState } from "./attribute-profile-create-dialog-state";
import { useAttributeProfileCreateDialogPresenter } from "./attribute-profile-create-dialog-presenter";
import { SelectOption } from "../../components/select-option";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const AttributeProfileCreateDialog = (props: DialogProps<AttributeProfileCreateDialogState>) => {
  const { state } = props;
  const presenter = useAttributeProfileCreateDialogPresenter(props);

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Model */}
      <InputLabelWrapper label="Model">
        <SelectModel state={state?.model} presenter={presenter.model} placeholder="Select model" />
      </InputLabelWrapper>

      {/* Name */}
      <InputLabelWrapper label="Name">
        <LanguageStringInput state={state?.name} presenter={presenter.name} placeholder="Enter name" />
      </InputLabelWrapper>

      {/* Domain */}
      <InputLabelWrapper label="Domain">
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain class" />
      </InputLabelWrapper>

      {/* IRI */}
      <InputLabelWrapper label="IRI">
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </InputLabelWrapper>

      {/* Definition */}
      <InputLabelWrapper label="Definition">
        <LanguageStringInput state={state?.definition} presenter={presenter.definition} placeholder="Enter definition" />
      </InputLabelWrapper>

      {/* Usage Note */}
      <InputLabelWrapper label="Usage Note">
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </InputLabelWrapper>

      {/* Domain Cardinality */}
      <InputLabelWrapper label="Domain Cardinality">
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} />
      </InputLabelWrapper>

      {/* Range */}
      <InputLabelWrapper label="Range">
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range class" />
      </InputLabelWrapper>

      {/* Range Cardinality */}
      <InputLabelWrapper label="Range Cardinality">
        <SelectCardinality state={state?.rangeCardinality} presenter={presenter.rangeCardinality} />
      </InputLabelWrapper>

      {/* External Documentation URL */}
      <InputLabelWrapper label="External documentation URL">
        <StringInput state={state?.externalDocumentationUrl} presenter={presenter.externalDocumentationUrl} placeholder="https://..." />
      </InputLabelWrapper>

      {/* Order */}
      <InputLabelWrapper label="Order">
        <StringInput state={state?.order} presenter={presenter.order} placeholder="Order identifier" />
      </InputLabelWrapper>

      {/* Mandatory level */}
      <InputLabelWrapper label="Mandatory level">
        <SelectOption state={state?.mandatoryLevel} presenter={presenter.mandatoryLevel} />
      </InputLabelWrapper>
    </div>
  );
};

export default AttributeProfileCreateDialog;
