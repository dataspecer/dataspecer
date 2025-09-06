import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  CmeSemanticClass,
  CmeSemanticGeneralization,
  CmeSemanticModel,
  CmeSemanticRelationship,
  isCmeSemanticModelReadOnly,
} from "./model";
import { SemanticEntity, SemanticModel } from "../semantic-model";
import { ModelDsIdentifier } from "../entity-model";
import {
  toCmeSemanticClass,
  toCmeSemanticGeneralization,
  toCmeSemanticModel,
  toCmeSemanticRelationship,
} from "./adapter";
import { CmeSemanticEntity } from "./model/cme-semantic-entity";
import { EntityDsIdentifier } from "../entity-model";

export interface CmeSemanticModelState {

  classes: CmeSemanticClass[];

  /**
   * Warning! This contains both semantic and profile generalizations.
   */
  generalizations: CmeSemanticGeneralization[];

  relationships: CmeSemanticRelationship[];

  models: CmeSemanticModel[];

}

export function createEmptyCmeSemanticModelState(): CmeSemanticModelState {
  return {
    classes: [],
    generalizations: [],
    relationships: [],
    models: [],
  };
}

/**
 * @returns A new state with updated entities.
 */
export function updateEntitiesInModel(
  state: CmeSemanticModelState,
  model: CmeSemanticModel,
  entities: SemanticEntity[],
): CmeSemanticModelState {
  const readOnly = isCmeSemanticModelReadOnly(model);
  // We start with nulls and only create an array when we need it.
  let classes = null;
  let generalizations = null;
  let relationships = null; ``
  for (const entity of entities) {
    if (isSemanticModelClass(entity)) {
      const next = toCmeSemanticClass(
        model.identifier, readOnly, entity);
      if (classes === null) {
        classes = [...state.classes];
      }
      updateOrAddEntity(classes, next);
    } else if (isSemanticModelGeneralization(entity)) {
      const next = toCmeSemanticGeneralization(
        model.identifier, readOnly, entity);
      if (generalizations === null) {
        generalizations = [...state.generalizations];
      }
      updateOrAddEntity(generalizations, next);
    } else if (isSemanticModelRelationship(entity)) {
      const next = toCmeSemanticRelationship(
        model.identifier, readOnly, entity);
      if (relationships === null) {
        relationships = [...state.relationships];
      }
      updateOrAddEntity(relationships, next);
    } else {
      // We ignore all other entities, they can be profiles, or other.
      continue;
    }
  }
  return {
    ...state,
    classes: classes ?? state.classes,
    generalizations: generalizations ?? state.generalizations,
    relationships: relationships ?? state.relationships,
  }
}

/**
 * Update entity in-place or add it to the end.
 */
function updateOrAddEntity<Type extends CmeSemanticEntity>(
  items: Type[],
  value: Type,
): void {
  const index = items.findIndex(
    item => item.model === value.model && item.identifier === value.identifier
  );
  //
  if (index !== -1) {
    items[index] = value;
  } else {
    items.push(value);
  }
}

/**
 * @returns A new state with removed entities.
 */
export function removeEntitiesFromModel(
  state: CmeSemanticModelState,
  model: ModelDsIdentifier,
  entities: EntityDsIdentifier[]
): CmeSemanticModelState {
  return {
    ...state,
    classes: removeEntities(state.classes, model, entities),
    generalizations: removeEntities(state.generalizations, model, entities),
    relationships: removeEntities(state.relationships, model, entities),
  };
}

function removeEntities<Type extends CmeSemanticEntity>(
  items: Type[],
  model: ModelDsIdentifier,
  removed: EntityDsIdentifier[],
): Type[] {
  return items.filter(
    item => item.model !== model || !removed.includes(item.identifier));
}

/**
 * @returns A new state reflecting change in models.
 */
export function updateSemanticModels(
  prev: CmeSemanticModelState,
  semanticModels: SemanticModel[],
): CmeSemanticModelState {

  const models: CmeSemanticModel[] = [];

  // Collect removed models and add new models.
  const nextIdentifiers = semanticModels.map(item => item.getId());
  const removedModels: ModelDsIdentifier[] = [];
  for (const model of prev.models) {
    const identifier = model.identifier;
    if (nextIdentifiers.includes(identifier)) {
      models.push(model);
    } else {
      removedModels.push(identifier);
    }
  }

  // Collect new models.
  const prevIdentifiers = prev.models.map(item => item.identifier);
  const addedModels: [SemanticModel, CmeSemanticModel][] = [];
  for (const model of semanticModels) {
    const identifier = model.getId()
    if (prevIdentifiers.includes(identifier)) {
      // We already have representation of the model.
      continue;
    } else {
      // Add a new model.
      const newModel = toCmeSemanticModel(model);
      models.push(newModel);
      addedModels.push([model, newModel]);
    }
  }

  // Prepare new state.
  let result: CmeSemanticModelState =
    removedModels.length === 0 ? {
      ...prev,
      models,
    } : {
      classes: removeEntitiesByModels(
        prev.classes, removedModels),
      generalizations: removeEntitiesByModels(
        prev.generalizations, removedModels),
      relationships: removeEntitiesByModels(
        prev.relationships, removedModels),
      models,
    };

  // We just use the update method on all entities.
  addedModels.forEach(([model, cmeModel]) => {
    result = updateEntitiesInModel(
      result, cmeModel, Object.values(model.getEntities()));
  });

  return result;
}

function removeEntitiesByModels<Type extends CmeSemanticEntity>(
  items: Type[],
  removedModels: ModelDsIdentifier[],
): Type[] {
  return items.filter(item => !removedModels.includes(item.model));
}

export function createCmeSemanticModelState(
  semanticModels: SemanticModel[],
): CmeSemanticModelState {
  return updateSemanticModels(
    createEmptyCmeSemanticModelState(),
    semanticModels);
}
