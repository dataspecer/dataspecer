import { SelectLabel } from "./adapter-context";
import { UI_RELATIONSHIP_TYPE, UiEntity, UiRelationship, UiSemanticModel } from "../model";
import { CmeRelationship } from "../../../dataspecer/cme-model";

export const cmeRelationshipToUiRelationship = (
  context: {
    selectLabel: SelectLabel,
  },
  model: UiSemanticModel,
  entity: CmeRelationship,
  domain: UiEntity,
  range: UiEntity,
): UiRelationship => {
  return {
    type: UI_RELATIONSHIP_TYPE,
    model,
    identifier: entity.identifier,
    label: context.selectLabel(entity.name, entity.iri, entity.identifier),
    domain,
    domainCardinality: entity.domainCardinality,
    range,
    rangeCardinality: entity.rangeCardinality,
  };
};
