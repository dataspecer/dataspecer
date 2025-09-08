import {
  CmeProfileClassAggregate,
  CmeProfileRelationshipAggregate,
  CmeSemanticClassAggregate,
  CmeGeneralizationAggregate,
  CmeSemanticRelationshipAggregate,
} from "./model";
import {
  CmeProfileModel,
} from "../cme-profile-model/model";
import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../entity-model";
import { CmeSemanticModel } from "../cme-semantic-model/model";
import {
  toCmeProfileClassAggregate,
  toCmeProfileRelationshipAggregate,
  toCmeSemanticClassAggregate,
  toCmeSemanticRelationshipAggregate,
} from "./adapter";
import { resolveSources } from "./utilities-internal";
import { CmeSemanticModelState } from "../cme-semantic-model";
import { CmeProfileModelState } from "../cme-profile-model";

type EntitiesRecord<Type> = Record<EntityDsIdentifier, Type>;

export interface CmeAggregateModelState {

  /**
   * Just a copy of profile models.
   * Model as same as in  {@link CmeAggregateModelState.semanticModels};
   */
  profileModels: EntitiesRecord<CmeProfileModel>;

  profileClasses: EntitiesRecord<CmeProfileClassAggregate>;

  profileRelationships: EntitiesRecord<CmeProfileRelationshipAggregate>;

  /**
   * Just a copy of semantic models.
   * Model as same as in  {@link CmeAggregateModelState.profileModels};
   */
  semanticModels: Record<ModelDsIdentifier, CmeSemanticModel>;

  semanticClasses: EntitiesRecord<CmeSemanticClassAggregate>;

  semanticRelationships: EntitiesRecord<CmeSemanticRelationshipAggregate>;

  /**
   * As we have no way to distinguish semantic and profile visualisation,
   * we put hem into one collection for now.SW
   */
  generalizations: EntitiesRecord<CmeGeneralizationAggregate>;

}

export function createEmptyCmeAggregateModelState(): CmeAggregateModelState {
  return {
    profileModels: {},
    profileClasses: {},
    profileRelationships: {},
    semanticModels: {},
    semanticClasses: {},
    semanticRelationships: {},
    generalizations: {},
  };
}

export function createCmeAggregateModelState(
  semantic: CmeSemanticModelState,
  profile: CmeProfileModelState,
): CmeAggregateModelState {

  // We start with the semantic model.
  // There we need to only aggregate multiple entities of the same
  // identifiers from multiple models.

  const semanticClasses: EntitiesRecord<CmeSemanticClassAggregate> = {};
  semantic.classes.forEach(item => {
    semanticClasses[item.identifier] =
      toCmeSemanticClassAggregate(
        item, semanticClasses[item.identifier]);
  });

  const semanticRelationships:
    EntitiesRecord<CmeSemanticRelationshipAggregate> = {};
  semantic.relationships.forEach(item => {
    semanticRelationships[item.identifier] =
      toCmeSemanticRelationshipAggregate(
        item, semanticRelationships[item.identifier]);
  });

  // Last we deal with profiles, they are the most complex
  // as they have declared dependencies for selected properties.
  // We do this in two steps, in the first step we convert all.
  // In the second step we update the dependencies.

  const profileClasses: EntitiesRecord<CmeProfileClassAggregate> = {};
  profile.classes.forEach(item => {
    profileClasses[item.identifier] =
      toCmeProfileClassAggregate(
        item, profileClasses[item.identifier]);
  });

  resolveSources(semanticClasses, profileClasses,
    item => item.nameSource,
    item => item.name,
    item => item.name,
    (item, value) => ({ ...item, nameAggregate: value }));
  resolveSources(semanticClasses, profileClasses,
    item => item.descriptionSource,
    item => item.description,
    item => item.description,
    (item, value) => ({ ...item, descriptionAggregate: value }));
  resolveSources(semanticClasses, profileClasses,
    item => item.usageNoteSource,
    () => null,
    item => item.usageNote,
    (item, value) => ({ ...item, usageNoteAggregate: value }));

  const profileRelationships:
    EntitiesRecord<CmeProfileRelationshipAggregate> = {};
  profile.relationships.forEach(item => {
    profileRelationships[item.identifier] =
      toCmeProfileRelationshipAggregate(
        item, profileRelationships[item.identifier]);
  });

  resolveSources(semanticRelationships, profileRelationships,
    item => item.nameSource,
    item => item.name,
    item => item.name,
    (item, value) => ({ ...item, nameAggregate: value }));
  resolveSources(semanticRelationships, profileRelationships,
    item => item.descriptionSource,
    item => item.description,
    item => item.description,
    (item, value) => ({ ...item, descriptionAggregate: value }));
  resolveSources(semanticRelationships, profileRelationships,
    item => item.usageNoteSource,
    () => null,
    item => item.usageNote,
    (item, value) => ({ ...item, usageNoteAggregate: value }));

  // At the end we need to deal with generalizations.

  const generalizations: EntitiesRecord<CmeGeneralizationAggregate> = {};
  semantic.generalizations.map(item => ({
    type: "cme-generalization-aggregate",
    identifier: item.identifier,
    model: item.model,
    models: [item.model],
    dependencies: [item.identifier],
    readOnly: item.readOnly,
    iri: item.iri,
    childIdentifier: item.childIdentifier,
    parentIdentifier: item.parentIdentifier,
  } as CmeGeneralizationAggregate))
    .forEach(item => generalizations[item.identifier] = item)

  const profileModels: Record<ModelDsIdentifier, CmeProfileModel> = {};
  profile.models.forEach(item => profileModels[item.identifier] = item);

  const semanticModels: Record<ModelDsIdentifier, CmeSemanticModel> = {};
  semantic.models.forEach(item => semanticModels[item.identifier] = item);

  return {
    profileModels,
    profileClasses,
    profileRelationships,
    semanticModels,
    semanticClasses,
    semanticRelationships,
    generalizations,
  };

}
