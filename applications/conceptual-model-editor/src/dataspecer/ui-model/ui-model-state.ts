import { AggregatedEntityWrapper, SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  UI_UNKNOWN_ENTITY_TYPE,
  UiClass,
  UiClassProfile,
  UiEntity,
  UiGeneralization,
  UiPrimitiveType,
  UiRelationship,
  UiRelationshipProfile,
  UiSemanticModel,
} from "./model";
import {
  cmeClassAggregateToUiClassProfile,
  cmeClassToUiClass,
  cmeGeneralizationToCmeGeneralization,
  cmePrimitiveTypeToUiPrimitiveType,
  cmeRelationshipAggregateToUiRelationshipProfile,
  cmeRelationshipToUiRelationship,
  cmeSemanticModelToUiSemanticModel,
} from "./adapter";
import { HexColor, VisualModel } from "@dataspecer/visual-model";
import { SemanticModel } from "../semantic-model";
import { createLogger } from "../../application";
import { createUiAdapterContext, UiAdapterContext } from "./adapter/adapter-context";
import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  listCmePrimitiveTypes,
  semanticClassToCmeClass,
  semanticGeneralizationToCmeGeneralization,
  semanticRelationshipToCmeRelationship,
} from "../cme-model/adapter";
import { semanticClassProfileToCmeClassAggregate } from "../cme-model/adapter/cme-class-profile-aggregate";
import {
  semanticRelationshipProfileToCmeRelationshipAggregate,
} from "../cme-model/adapter/cme-relationship-aggregate-adapter";
import {
  OwlCmeSemanticModel,
  OwlThingCmeEntity,
  UnknownCmeEntity,
  UnknownCmeSemanticModel,
  UnspecifiedCmeEntity,
  semanticModelToCmeSemanticModel,
} from "../cme-model";
import { languageStringToString } from "../../utilities/string";
import { EntityDsIdentifier } from "../entity-model";
import { Entity } from "@dataspecer/core-v2";

const LOG = createLogger(import.meta.url);

export interface UiModelState {

  /**
   * Represent an undefined or missing semantic model.
   */
  unknownSemanticModel: UiSemanticModel;

  unknownUiEntity: UiEntity;

  unspecifiedUiEntity: UiEntity;

  primitiveTypes: UiPrimitiveType[];

  semanticModels: UiSemanticModel[];

  classes: UiClass[];

  classProfiles: UiClassProfile[];

  relationships: UiRelationship[];

  relationshipProfiles: UiRelationshipProfile[];

  generalizations: UiGeneralization[];

  /**
   * Here we store unknown entities.
   * Those are entities referenced from other entities but not found.
   */
  unknown: UiEntity[];

}

export function createEmptyUiModelState(
  language: string,
  languagePreferences: string[],
  defaultModelColor: HexColor,
): UiModelState {
  //
  const unknownSemanticModel: UiSemanticModel = {
    identifier: UnknownCmeSemanticModel.identifier,
    modelType: UnknownCmeSemanticModel.modelType,
    label: languageStringToString(
      languagePreferences, language, UnknownCmeSemanticModel.name),
    color: defaultModelColor,
    buildIn: true,
  };
  Object.freeze(unknownSemanticModel);
  //
  const unknownUiEntity: UiEntity = {
    identifier: UnknownCmeEntity.identifier,
    label: languageStringToString(
      languagePreferences, language, UnknownCmeEntity.name),
    model: unknownSemanticModel,
    type: UI_UNKNOWN_ENTITY_TYPE,
    buildIn: true,
  };
  Object.freeze(unknownUiEntity);
  //
  const unspecifiedUiEntity: UiEntity = {
    identifier: UnspecifiedCmeEntity.identifier,
    label: languageStringToString(
      languagePreferences, language, UnspecifiedCmeEntity.name),
    model: unknownSemanticModel,
    type: UI_UNKNOWN_ENTITY_TYPE,
    buildIn: true,
  };
  Object.freeze(unspecifiedUiEntity);
  //
  const owlSemanticModel: UiSemanticModel = {
    identifier: OwlCmeSemanticModel.identifier,
    modelType: OwlCmeSemanticModel.modelType,
    label: languageStringToString(
      languagePreferences, language, OwlCmeSemanticModel.name),
    color: defaultModelColor,
    buildIn: true,
  }
  //
  const owlThing: UiEntity = {
    identifier: OwlThingCmeEntity.identifier,
    label: languageStringToString(
      languagePreferences, language, OwlThingCmeEntity.name),
    model: owlSemanticModel,
    type: UI_UNKNOWN_ENTITY_TYPE,
    buildIn: true,
  };
  //
  const primitiveTypes: UiPrimitiveType[] = listCmePrimitiveTypes()
    .map(item => cmePrimitiveTypeToUiPrimitiveType({
      selectLabel: value => languageStringToString(
        languagePreferences, language, value),
    }, unknownSemanticModel, item));
  Object.freeze(primitiveTypes);
  return {
    unknownSemanticModel,
    unknownUiEntity,
    unspecifiedUiEntity,
    primitiveTypes,
    semanticModels: [],
    classes: [],
    classProfiles: [],
    relationships: [],
    relationshipProfiles: [],
    generalizations: [],
    unknown: [owlThing],
  };
}

/**
 * Create ui-model state using cme-model from semantic model.
 */
export function createUiModelState(
  aggregatorView: SemanticModelAggregatorView,
  semanticModels: SemanticModel[],
  language: string,
  languagePreferences: string[],
  visualModel: VisualModel | null,
  defaultModelColor: HexColor,
): UiModelState {
  const state = createEmptyUiModelState(
    language, languagePreferences, defaultModelColor);

  // Prepare context.
  const context = createUiAdapterContext(
    language, languagePreferences, visualModel,
    defaultModelColor, semanticModels);

  loadUiSemanticModels(
    visualModel, defaultModelColor, context, semanticModels, state);

  // Problem with loading entities are dependencies.
  // Luckily we can load them in order of class, relationship and generalization.
  // Then when loading one the required should be already loaded.
  const entityMap: Map<EntityDsIdentifier, UiEntity> = new Map();
  updateEntityMap(entityMap, state.primitiveTypes);
  updateEntityMap(entityMap, state.unknown);

  const aggregatorEntities = aggregatorView.getEntities();

  loadUiClassesAndProfiles(
    context, semanticModels, aggregatorEntities, state);
  updateEntityMap(entityMap, state.classes);
  updateEntityMap(entityMap, state.classProfiles);

  loadUiRelationshipAndProfiles(
    context, semanticModels, aggregatorEntities, entityMap, state);
  updateEntityMap(entityMap, state.relationships);
  updateEntityMap(entityMap, state.relationshipProfiles);

  loadUiGeneralizations(
    semanticModels, aggregatorEntities, entityMap, state);

  return state;
}

function loadUiSemanticModels(
  visualModel: VisualModel | null,
  defaultModelColor: HexColor,
  context: UiAdapterContext,
  semanticModels: SemanticModel[],
  state: UiModelState,
): void {
  state.semanticModels = semanticModels
    .map(model => semanticModelToCmeSemanticModel(
      model, visualModel, defaultModelColor, id => id))
    .map(model => cmeSemanticModelToUiSemanticModel(context, model));
}

function loadUiClassesAndProfiles(
  context: UiAdapterContext,
  semanticModels: SemanticModel[],
  aggregatorEntities: Record<string, AggregatedEntityWrapper>,
  state: UiModelState,
): void {
  withEntities(semanticModels, state, aggregatorEntities,
    item => isSemanticModelClass(item) || isSemanticModelClassProfile(item),
    (model, raw, aggregate) => {
      if (isSemanticModelClass(aggregate)) {
        const cme = semanticClassToCmeClass(model.identifier, aggregate);
        state.classes.push(cmeClassToUiClass(context, model, cme));
      }
      if (isSemanticModelClassProfile(raw)
        && isSemanticModelClassProfile(aggregate)) {
        const cme = semanticClassProfileToCmeClassAggregate(
          model.identifier, raw, aggregate);
        state.classProfiles.push(cmeClassAggregateToUiClassProfile(
          context, model, cme));
      }
    });
}

/**
 * Find entities that pass {@link filter} and call {@link accept} on them.
 */
function withEntities<Type extends Entity>(
  semanticModels: SemanticModel[],
  state: UiModelState,
  aggregatorEntities: Record<string, AggregatedEntityWrapper>,
  filter: (entity: Entity) => entity is Type,
  accept: (semanticModel: UiSemanticModel, raw: Type, aggregate: Type) => void,
): void {
  for (const model of semanticModels) {
    const uiSemanticModel = secureUiSemanticModel(state, model);
    for (const [entityIdentifier, entity] of Object.entries(model.getEntities())) {
      const wrap = aggregatorEntities[entityIdentifier];
      if (wrap === undefined) {
        LOG.invalidEntity(entityIdentifier,
          "Wrap for an entity is undefined.",
          { entity });
        continue;
      }
      const raw = wrap?.rawEntity;
      const aggregate = wrap?.aggregatedEntity;
      if (raw === null || aggregate === null) {
        // This should not happen, if it does it will produce a lot of
        // messages as this function is called multiple times.
        LOG.invalidEntity(entityIdentifier,
          "Raw entity or aggregate are null.",
          { entity, raw, aggregate });
        continue;
      }
      if (filter(raw) && filter(aggregate)) {
        accept(uiSemanticModel, raw, aggregate);
      }
    }
  }
}

function secureUiSemanticModel(
  state: UiModelState,
  semanticModel: SemanticModel,
): UiSemanticModel {
  const identifier = semanticModel.getId();
  const uiSemanticModel = state.semanticModels
    .find(item => item.identifier === identifier);
  if (uiSemanticModel === undefined) {
    // This should not happen as all models should be part of the state.
    LOG.error("Missing semantic model.", { state, identifier });
    return state.unknownSemanticModel;
  }
  return uiSemanticModel;
}

function updateEntityMap(
  entityMap: Map<EntityDsIdentifier, UiEntity>, entities: UiEntity[],
): void {
  entities.forEach(item => entityMap.set(item.identifier, item));
}

function loadUiRelationshipAndProfiles(
  context: UiAdapterContext,
  semanticModels: SemanticModel[],
  aggregatorEntities: Record<string, AggregatedEntityWrapper>,
  entityMap: Map<EntityDsIdentifier, UiEntity>,
  state: UiModelState,
): void {

  const findEntity = createFindEntity(entityMap, state);

  withEntities(semanticModels, state, aggregatorEntities,
    item => isSemanticModelRelationship(item) || isSemanticModelRelationshipProfile(item),
    (model, raw, aggregate) => {
      if (isSemanticModelRelationship(aggregate)) {
        const cme = semanticRelationshipToCmeRelationship(
          model.identifier, aggregate);
        state.relationships.push(cmeRelationshipToUiRelationship(
          context, model, cme, findEntity(cme.domain), findEntity(cme.range)));
      }
      if (isSemanticModelRelationshipProfile(raw)
        && isSemanticModelRelationshipProfile(aggregate)) {
        const cme = semanticRelationshipProfileToCmeRelationshipAggregate(
          model.identifier, raw, aggregate);
        state.relationshipProfiles.push(
          cmeRelationshipAggregateToUiRelationshipProfile(
            context, model, cme, findEntity(cme.domain), findEntity(cme.range)));
      }
    });
}

function createFindEntity(
  entityMap: Map<EntityDsIdentifier, UiEntity>,
  state: UiModelState,
) {
  return (identifier: EntityDsIdentifier | null): UiEntity => {
    if (identifier === null) {
      return state.unspecifiedUiEntity;
    }
    const entity = entityMap.get(identifier);
    if (entity !== undefined) {
      return entity;
    }
    // We have identifier but no entity, we create a representant
    const result: UiEntity = {
      ...state.unknownUiEntity,
      identifier,
    };
    // Remove build-in flag.
    delete result.buildIn;
    // Add to list of unknowns.
    state.unknown.push(result);
    // We also add this to the entity list to avoid duplicities.
    entityMap.set(result.identifier, result);
    return result;
  };
}

function loadUiGeneralizations(
  semanticModels: SemanticModel[],
  aggregatorEntities: Record<string, AggregatedEntityWrapper>,
  entityMap: Map<EntityDsIdentifier, UiEntity>,
  state: UiModelState,
): void {

  const findEntity = createFindEntity(entityMap, state);

  withEntities(semanticModels, state, aggregatorEntities,
    item => isSemanticModelGeneralization(item),
    (model, raw, aggregate) => {
      const cme = semanticGeneralizationToCmeGeneralization(
        model.identifier, aggregate);
      state.generalizations.push(cmeGeneralizationToCmeGeneralization(
        model, cme,
        findEntity(cme.parentIdentifier), findEntity(cme.childIdentifier)));
    });
}
