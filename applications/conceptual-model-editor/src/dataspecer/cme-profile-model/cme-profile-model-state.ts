import {
  isSemanticModelClassProfile,
  isSemanticModelGeneralizationProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/profile-model";

import {
  CmeProfileClass,
  CmeProfileGeneralization,
  CmeProfileModel,
  CmeProfileRelationship,
  isCmeProfileModelReadOnly,
} from "./model";
import { ProfileEntity, ProfileModel } from "../profile-model";
import { ModelDsIdentifier } from "../entity-model";
import {
  toCmeProfileClass,
  toCmeProfileGeneralization,
  toCmeProfileModel,
  toCmeProfileRelationship,
} from "./adapter";
import { CmeProfileEntity } from "./model/cme-profile-entity";
import { EntityDsIdentifier } from "../entity-model";

export interface CmeProfileModelState {

  classes: CmeProfileClass[];

  /**
   * Warning! This contains both semantic and profile generalizations.
   */
  generalizations: CmeProfileGeneralization[];

  relationships: CmeProfileRelationship[];

  /**
   * Warning! This contains both semantic and profile data.
   */
  models: CmeProfileModel[];

}

export function createEmptyCmeProfileModelState(): CmeProfileModelState {
  return {
    classes: [],
    generalizations: [],
    relationships: [],
    models: [],
  };
}

export function updateEntitiesInProfileModel(
  state: CmeProfileModelState,
  model: CmeProfileModel,
  entities: ProfileEntity[],
): CmeProfileModelState {
  const readOnly = isCmeProfileModelReadOnly(model)
  // We start with nulls and only create an array when we need it.
  let classes = null;
  let generalizations = null;
  let relationships = null;
  for (const entity of entities) {
    if (isSemanticModelClassProfile(entity)) {
      const next = toCmeProfileClass(
        model.identifier, readOnly, entity);
      if (classes === null) {
        classes = [...state.classes];
      }
      updateOrAddEntity(classes, next);
    } else if (isSemanticModelGeneralizationProfile(entity)) {
      const next = toCmeProfileGeneralization(
        model.identifier, readOnly, entity);
      if (generalizations === null) {
        generalizations = [...state.generalizations];
      }
      updateOrAddEntity(generalizations, next);
    } else if (isSemanticModelRelationshipProfile(entity)) {
      const next = toCmeProfileRelationship(
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
function updateOrAddEntity<Type extends CmeProfileEntity>(
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

export function removeEntitiesFromProfileModel(
  state: CmeProfileModelState,
  model: ModelDsIdentifier,
  entities: EntityDsIdentifier[],
): CmeProfileModelState {
  return {
    ...state,
    classes: removeEntities(state.classes, model, entities),
    generalizations: removeEntities(state.generalizations, model, entities),
    relationships: removeEntities(state.relationships, model, entities),
  };
}

function removeEntities<Type extends CmeProfileEntity>(
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
export function updateProfileModels(
  prev: CmeProfileModelState,
  ProfileModels: ProfileModel[],
): CmeProfileModelState {

  const models: CmeProfileModel[] = [];

  // Collect removed models.
  const nextIdentifiers = ProfileModels.map(item => item.getId());
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
  const addedModels: [ProfileModel, CmeProfileModel][] = [];
  for (const model of ProfileModels) {
    const identifier = model.getId()
    if (prevIdentifiers.includes(identifier)) {
      // We already have representation of the model.
      continue;
    } else {
      // Add a new model.
      const newModel = toCmeProfileModel(model);
      models.push(newModel);
      addedModels.push([model, newModel]);
    }
  }

  // Prepare new state.
  let result: CmeProfileModelState =
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

  // Add entities from new model
  addedModels.forEach(([model, cmeModel]) => {
    result = updateEntitiesInProfileModel(
      result, cmeModel, Object.values(model.getEntities()));
  });

  return result;
}

function removeEntitiesByModels<Type extends CmeProfileEntity>(
  items: Type[],
  removedModels: ModelDsIdentifier[],
): Type[] {
  return items.filter(item => !removedModels.includes(item.model));
}

export function createCmeProfileModelState(
  profileModels: ProfileModel[],
): CmeProfileModelState {
  return updateProfileModels(
    createEmptyCmeProfileModelState(),
    profileModels);
}
