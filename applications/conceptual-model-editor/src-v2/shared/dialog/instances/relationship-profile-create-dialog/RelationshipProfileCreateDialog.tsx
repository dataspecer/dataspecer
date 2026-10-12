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

export const RelationshipProfileCreateDialog = (props: DialogProps<RelationshipProfileCreateDialogState>) => {
  const { state } = props;
  const presenter = useRelationshipProfileCreateDialogPresenter(props);

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Model
        </label>
        <SelectModel state={state?.model} presenter={presenter.model} placeholder="Select model" />
      </div>

      {/* Profile of */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Profile of
        </label>
        <SelectEntities state={state?.profileOf} presenter={presenter.profileOf} placeholder="Select relationships" />
      </div>

      {/* Domain */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Domain
        </label>
        <SelectEntity state={state?.domain} presenter={presenter.domain} placeholder="Select domain class" />
      </div>

      {/* IRI */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          IRI
        </label>
        <IriInput state={state?.iri} presenter={presenter.iri} />
      </div>

      {/* Specialization of */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Specialization of
        </label>
        <SelectEntities state={state?.specializationOf} presenter={presenter.specializationOf} placeholder="Select specialization" />
      </div>

      {/* Usage Note */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Usage Note
        </label>
        <LanguageStringInput state={state?.usageNote} presenter={presenter.usageNote} placeholder="Enter usage note" />
      </div>

      {/* Domain cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Domain cardinality
        </label>
        <SelectCardinality state={state?.domainCardinality} presenter={presenter.domainCardinality} />
      </div>

      {/* Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Range
        </label>
        <SelectEntity state={state?.range} presenter={presenter.range} placeholder="Select range class" />
      </div>

      {/* Range cardinality */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Range cardinality
        </label>
        <SelectCardinality state={state?.rangeCardinality} presenter={presenter.rangeCardinality} />
      </div>

      {/* External documentation URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          External documentation URL
        </label>
        <StringInput state={state?.externalDocumentationUrl} presenter={presenter.externalDocumentationUrl} placeholder="https://..." />
      </div>

      {/* Order */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Order
        </label>
        <StringInput state={state?.order} presenter={presenter.order} placeholder="Order identifier" />
      </div>

      {/* Mandatory level (no matching component) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Mandatory level
        </label>
       <SelectOption state={state?.mandatoryLevel} presenter={presenter.mandatoryLevel}/>
      </div>
    </div>
  );
};

export default RelationshipProfileCreateDialog;
