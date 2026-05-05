import { SelectLabel, SelectLanguageString, SelectModelsWithEntity } from "./adapter-context";
import { UI_RELATIONSHIP_PROFILE_TYPE, UiEntity, UiReference, UiRelationshipProfile, UiSemanticModel } from "../model";
import { CmeRelationshipAggregate } from "../../../dataspecer/cme-model";

export const cmeRelationshipAggregateToUiRelationshipProfile = (
  context: {
    selectLabel: SelectLabel,
    selectLanguageString: SelectLanguageString,
    selectModelsWithEntity: SelectModelsWithEntity,
  },
  model: UiSemanticModel,
  entity: CmeRelationshipAggregate,
  domain: UiEntity,
  range: UiEntity,
): UiRelationshipProfile => {

  const profiling: UiReference[] = [];
  for (const profileOf of entity.profileOf) {
    for (const model of context.selectModelsWithEntity(profileOf)) {
      profiling.push({
        identifier: profileOf,
        model,
      });
    }
  }
  return {
    type: UI_RELATIONSHIP_PROFILE_TYPE,
    model,
    identifier: entity.identifier,
    label: context.selectLabel(entity.name, entity.iri, entity.identifier),
    domain,
    domainCardinality: entity.domainCardinality,
    range,
    rangeCardinality: entity.rangeCardinality,
    usageNote: context.selectLanguageString(entity.usageNote),
    profiling,
    mandatoryLevel: entity.mandatoryLevel,
  };
};
