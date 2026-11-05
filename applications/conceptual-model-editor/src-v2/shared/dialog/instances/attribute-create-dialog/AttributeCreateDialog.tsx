// Component for AttributeCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntity } from "../../components/select-entity";
import { SelectEntities } from "../../components/select-entities";
import { LanguageStringInput } from "../../components/language-string-input";
import { IriInput } from "../../components/iri-input";
import { StringInput } from "../../components/string-input";
import { SelectCardinality } from "../../components/select-cardinality";
import { SelectOption } from "../../components/select-option";
import { AttributeCreateDialogState } from "./attribute-create-dialog-state";
import { useAttributeCreateDialogPresenter } from "./attribute-create-dialog-presenter";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const AttributeCreateDialog = (props: DialogProps<AttributeCreateDialogState>) => {
  const { state } = props;
  const presenter = useAttributeCreateDialogPresenter(props);

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
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain" />
      </InputLabelWrapper>

      {/* IRI */}
      <InputLabelWrapper label="IRI">
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </InputLabelWrapper>

      {/* Definition */}
      <InputLabelWrapper label="Definition">
        <LanguageStringInput state={state?.definition} presenter={presenter.definition} placeholder="Enter definition" />
      </InputLabelWrapper>

      {/* Usage note */}
      <InputLabelWrapper label="Usage note">
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </InputLabelWrapper>

      {/* Domain cardinality */}
      <InputLabelWrapper label="Domain cardinality">
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} />
      </InputLabelWrapper>

      {/* Range */}
      <InputLabelWrapper label="Range">
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range" />
      </InputLabelWrapper>

      {/* Range cardinality */}
      <InputLabelWrapper label="Range cardinality">
        <SelectCardinality state={state?.rangeCardinality} presenter={presenter.rangeCardinality} />
      </InputLabelWrapper>

      {/* External documentation URL */}
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

export default AttributeCreateDialog;
