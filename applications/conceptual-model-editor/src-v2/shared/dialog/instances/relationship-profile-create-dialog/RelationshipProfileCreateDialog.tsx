// Component for RelationshipProfileCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntities } from "../../components/select-entities";
import { SelectEntity } from "../../components/select-entity";
import { IriInput } from "../../components/iri-input";
import { LanguageStringInput } from "../../components/language-string-input";
import { SelectCardinality } from "../../components/select-cardinality";
import { StringInput } from "../../components/string-input";
import { RelationshipProfileCreateDialogState } from "./relationship-profile-create-dialog-state";
import { useRelationshipProfileCreateDialogPresenter } from "./relationship-profile-create-dialog-presenter";
import { SelectOption } from "../../components/select-option";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const RelationshipProfileCreateDialog = (props: DialogProps<RelationshipProfileCreateDialogState>) => {
  const { state } = props;
  const presenter = useRelationshipProfileCreateDialogPresenter(props);

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Model */}
      <InputLabelWrapper label="Model">
        <SelectModel state={state?.model} presenter={presenter.model} placeholder="Select model" />
      </InputLabelWrapper>

      {/* Profile of */}
      <InputLabelWrapper label="Profile of">
        <SelectEntities state={state?.profileOf} presenter={presenter.profileOf} placeholder="Select relationships" />
      </InputLabelWrapper>

      {/* Domain */}
      <InputLabelWrapper label="Domain">
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain class" />
      </InputLabelWrapper>

      {/* IRI */}
      <InputLabelWrapper label="IRI">
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </InputLabelWrapper>

      {/* Specialization of */}
      <InputLabelWrapper label="Specialization of">
        <SelectEntities state={state?.specializationOf} presenter={presenter.specializationOf} placeholder="Select specialization" />
      </InputLabelWrapper>

      {/* Usage Note */}
      <InputLabelWrapper label="Usage Note">
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </InputLabelWrapper>

      {/* Domain cardinality */}
      <InputLabelWrapper label="Domain cardinality">
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} />
      </InputLabelWrapper>

      {/* Range */}
      <InputLabelWrapper label="Range">
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range class" />
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

      {/* Mandatory level (no matching component) */}
      <InputLabelWrapper label="Mandatory level">
       <SelectOption state={state?.mandatoryLevel} presenter={presenter.mandatoryLevel}/>
      </InputLabelWrapper>
    </div>
  );
};

export default RelationshipProfileCreateDialog;
