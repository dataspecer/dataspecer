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

export const AttributeProfileCreateDialog = (props: DialogProps<AttributeProfileCreateDialogState>) => {
  const { state } = props;
  const presenter = useAttributeProfileCreateDialogPresenter(props);

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
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain class" />
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

      {/* Usage Note */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage Note</label>
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </div>

      {/* Domain Cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain Cardinality</label>
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} />
      </div>

      {/* Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Range</label>
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range class" />
      </div>

      {/* Range Cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Range Cardinality</label>
        <SelectCardinality state={state?.rangeCardinality} presenter={presenter.rangeCardinality} />
      </div>

      {/* External Documentation URL */}
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
        <SelectOption state={state?.mandatoryLevel} presenter={presenter.mandatoryLevel} />
      </div>
    </div>
  );
};

export default AttributeProfileCreateDialog;
