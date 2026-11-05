// Component for ClassProfileCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntities } from "../../components/select-entities";
import { LanguageStringInput } from "../../components/language-string-input";
import { IriInput } from "../../components/iri-input";
import { StringInput } from "../../components/string-input";
import { ClassProfileCreateDialogState } from "./class-profile-create-dialog-state";
import { useClassProfileCreateDialogPresenter } from "./class-profile-create-dialog-presenter";
import { SelectOption } from "../../components/select-option";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const ClassProfileCreateDialog = (props: DialogProps<ClassProfileCreateDialogState>) => {
  const { state } = props;
  const presenter = useClassProfileCreateDialogPresenter(props);

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Model */}
      <InputLabelWrapper label="Model">
        <SelectModel state={state?.model} presenter={presenter.model} placeholder="Select model" />
      </InputLabelWrapper>

      {/* Profile of */}
      <InputLabelWrapper label="Profile of">
        <SelectEntities state={state?.profileOf} presenter={presenter.profileOf} placeholder="Select classes" />
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

      {/* Usage Note */}
      <InputLabelWrapper label="Usage Note">
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </InputLabelWrapper>

      {/* External documentation URL */}
      <InputLabelWrapper label="External documentation URL">
        <StringInput state={state?.externalDocumentationUrl} presenter={presenter.externalDocumentationUrl} placeholder="https://..." />
      </InputLabelWrapper>

      {/* Order */}
      <InputLabelWrapper label="Order">
        <StringInput state={state?.order} presenter={presenter.order} placeholder="Order identifier" />
      </InputLabelWrapper>

      {/* Role (no matching component) */}
      <InputLabelWrapper label="Role">
        <SelectOption state={state?.role} presenter={presenter.role}/>
      </InputLabelWrapper>
    </div>
  );
};

export default ClassProfileCreateDialog;
