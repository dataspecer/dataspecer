// Component for ClassCreateDialog
import { type DialogProps } from "../../dialog-api";
import { SelectModel } from "../../components/select-model";
import { SelectEntities } from "../../components/select-entities";
import { LanguageStringInput } from "../../components/language-string-input";
import { IriInput } from "../../components/iri-input";
import { StringInput } from "../../components/string-input";
import { ClassCreateDialogState } from "./class-create-dialog-state";
import { useClassCreateDialogPresenter } from "./class-create-dialog-presenter";

export const ClassCreateDialog = (props: DialogProps<ClassCreateDialogState>) => {
  const { state } = props;
  const presenter = useClassCreateDialogPresenter(props);

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
        <SelectModel state={state?.model} presenter={presenter.model} placeholder="Select model" />
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
        <LanguageStringInput state={state?.name} presenter={presenter.name} placeholder="Enter name" />
      </div>

      {/* IRI */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IRI</label>
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </div>

      {/* Specialization of */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialization of</label>
        <SelectEntities state={state?.specializationOf} presenter={presenter.specializationOf} placeholder="Select specialization" />
      </div>

      {/* Definition */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Definition</label>
        <LanguageStringInput state={state?.definition} presenter={presenter.definition} placeholder="Enter definition" />
      </div>

      {/* External documentation URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">External documentation URL</label>
        <StringInput state={state?.externalDocumentationUrl} presenter={presenter.externalDocumentationUrl} placeholder="https://..." />
      </div>

      {/* Order */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</label>
        <StringInput state={state?.order} presenter={presenter.order} placeholder="Order identifier" />
      </div>
    </div>
  );
};

export default ClassCreateDialog;
