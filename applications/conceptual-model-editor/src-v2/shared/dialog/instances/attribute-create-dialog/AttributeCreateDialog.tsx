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

export const AttributeCreateDialog = (props: DialogProps<AttributeCreateDialogState>) => {
  const { state } = props;
  const presenter = useAttributeCreateDialogPresenter(props);

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

      {/* Domain */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain</label>
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain" />
      </div>

      {/* IRI */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IRI</label>
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </div>

      {/* Definition */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Definition</label>
        <LanguageStringInput state={state?.definition} presenter={presenter.definition} placeholder="Enter definition" />
      </div>

      {/* Usage note */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage note</label>
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </div>

      {/* Domain cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain cardinality</label>
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} placeholder="Select cardinality" />
      </div>

      {/* Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Range</label>
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range" />
      </div>

      {/* Range cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Range cardinality</label>
        <SelectCardinality state={state?.rangeCardinality} presenter={presenter.rangeCardinality} placeholder="Select cardinality" />
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

      {/* Mandatory level */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mandatory level</label>
        <SelectOption state={state?.mandatoryLevel} presenter={presenter.mandatoryLevel} placeholder="Select level" />
      </div>
    </div>
  );
};

export default AttributeCreateDialog;
