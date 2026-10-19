// Component for ClassCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntities } from "../../components/select-entities";
import { LanguageStringInput } from "../../components/language-string-input";
import { IriInput } from "../../components/iri-input";
import { StringInput } from "../../components/string-input";
import { ClassCreateDialogState } from "./class-create-dialog-state";
import { useClassCreateDialogPresenter } from "./class-create-dialog-presenter";
import { InputLabelWrapper } from "../../components/label-wrapper/input-label-wrapper-view";

export const ClassCreateDialog = (props: DialogProps<ClassCreateDialogState>) => {
  const { state } = props;
  const presenter = useClassCreateDialogPresenter(props);

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

export default ClassCreateDialog;
