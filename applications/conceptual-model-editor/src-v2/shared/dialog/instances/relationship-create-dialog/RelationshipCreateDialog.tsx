// Component for RelationshipCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntity } from "../../components/select-entity";
import { SelectEntities } from "../../components/select-entities";
import { LanguageStringInput } from "../../components/language-string-input";
import { IriInput } from "../../components/iri-input";
import { StringInput } from "../../components/string-input";
import { RelationshipCreateDialogState } from "./relationship-create-dialog-state";
import { useRelationshipCreateDialogPresenter } from "./relationship-create-dialog-presenter";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const RelationshipCreateDialog = (props: DialogProps<RelationshipCreateDialogState>) => {
  const { state } = props;
  const presenter = useRelationshipCreateDialogPresenter(props);

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

      {/* IRI */}
      <InputLabelWrapper label="IRI">
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </InputLabelWrapper>

      {/* Specialization of */}
      <InputLabelWrapper label="Specialization of">
        <SelectEntities state={state?.specializationOf} presenter={presenter.specializationOf} placeholder="Select specialization" />
      </InputLabelWrapper>

      {/* Definition */}
      <InputLabelWrapper label="Definition">
        <LanguageStringInput state={state?.definition} presenter={presenter.definition} placeholder="Enter definition" />
      </InputLabelWrapper>

      {/* Domain */}
      <InputLabelWrapper label="Domain">
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain" />
      </InputLabelWrapper>

      {/* Range */}
      <InputLabelWrapper label="Range">
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range" />
      </InputLabelWrapper>

      {/* External documentation URL */}
      <InputLabelWrapper label="External documentation URL">
        <StringInput state={state?.externalDocumentationUrl} presenter={presenter.externalDocumentationUrl} placeholder="https://..." />
      </InputLabelWrapper>

      {/* Order */}
      <InputLabelWrapper label="Order">
        <StringInput state={state?.order} presenter={presenter.order} placeholder="Order identifier" />
      </InputLabelWrapper>
    </div>
  );
};

export default RelationshipCreateDialog;
