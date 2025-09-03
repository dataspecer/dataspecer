import React, { useCallback, useContext, useEffect, useState } from "react";

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
import { createLogger } from "../../application";

const logger = createLogger(import.meta.url);

export interface CmeProfileModelContext {

  classes: CmeProfileClass[];

  /**
   * Warning! This contains both semantic and profile generalizations.
   */
  generalizations: CmeProfileGeneralization[];

  relationships: CmeProfileRelationship[];

  models: CmeProfileModel[];

  subscriptions: { [identifier: ModelDsIdentifier]: () => void };

}

const CmeProfileModelContextReact =
  React.createContext<CmeProfileModelContext>(null as any);

export const useCmeProfileContext = (): CmeProfileModelContext => {
  return useContext(CmeProfileModelContextReact);
}

export function CmeProfileModelContextProvider(
  props: {
    /**
     * The value must change if there is a new model.
     */
    profileModels: Map<String, ProfileModel>,
    children: React.ReactNode,
  },
) {
  const [state, setState] = useState<CmeProfileModelContext>({
    classes: [],
    generalizations: [],
    relationships: [],
    models: [],
    subscriptions: {},
  });

  const onEntitiesDidChange = useCallback((
    profileModel: ProfileModel,
    updated: Record<string, ProfileEntity>,
    removed: string[],
  ) => {
    setState(prev => {
      const model = prev.models
        .find(item => item.identifier === profileModel.getId());
      if (model === undefined) {
        logger.error("Ignoring cme-profile-model update for an unknown model",
          { models: prev.models, model: profileModel.getId() });
        return prev;
      }
      const next = updateEntities(prev, model, Object.values(updated));
      return {
        ...prev,
        classes: removeEntities(
          next.classes, model.identifier, removed),
        generalizations: removeEntities(
          next.generalizations, model.identifier, removed),
        relationships: removeEntities(
          next.relationships, model.identifier, removed),
      };
    });
  }, [setState]);

  useEffect(() => {
    const profileModels = [...props.profileModels.values()];
    setState(prev => updateModels(onEntitiesDidChange, prev, profileModels));
  }, [setState, onEntitiesDidChange, props.profileModels]);

  return (
    <CmeProfileModelContextReact.Provider value={state}>
      {props.children}
    </CmeProfileModelContextReact.Provider>
  )
}

function updateEntities(
  state: CmeProfileModelContext,
  model: CmeProfileModel,
  entities: ProfileEntity[],
): CmeProfileModelContext {
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

function removeEntities<Type extends CmeProfileEntity>(
  items: Type[],
  model: ModelDsIdentifier,
  removed: EntityDsIdentifier[],
): Type[] {
  return items.filter(
    item => item.model !== model || !removed.includes(item.identifier));
}

function updateModels(
  onEntitiesDidChange: (
    model: ProfileModel,
    updated: Record<string, ProfileEntity>,
    removed: string[]
  ) => void,
  prev: CmeProfileModelContext,
  ProfileModels: ProfileModel[],
): CmeProfileModelContext {

  const models: CmeProfileModel[] = [];
  const subscriptions: { [identifier: ModelDsIdentifier]: () => void } = {};

  // Collect removed models.
  const nextIdentifiers = ProfileModels.map(item => item.getId());
  const removedModels: ModelDsIdentifier[] = [];
  for (const model of prev.models) {
    const identifier = model.identifier;
    if (nextIdentifiers.includes(identifier)) {
      // Keep existing model.
      models.push(model);
      subscriptions[identifier] = prev.subscriptions[identifier];
    } else {
      // Remove existing.
      removedModels.push(identifier);
      prev.subscriptions[identifier]();
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
      // Register for changes and store deregistration callback.
      subscriptions[identifier] = model.subscribeToChanges(
        (updated, removed) => onEntitiesDidChange(model, updated, removed));
    }
  }

  // Prepare new state.
  let result: CmeProfileModelContext =
    removedModels.length === 0 ? {
      ...prev,
      models,
      subscriptions
    } : {
      classes: removeEntitiesByModels(
        prev.classes, removedModels),
      generalizations: removeEntitiesByModels(
        prev.generalizations, removedModels),
      relationships: removeEntitiesByModels(
        prev.relationships, removedModels),
      models,
      subscriptions,
    };

  // Add entities from new model
  addedModels.forEach(([model, cmeModel]) => {
    result = updateEntities(
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

