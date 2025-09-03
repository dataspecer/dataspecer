import React, { useCallback, useContext, useEffect, useState } from "react";

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
import { createLogger } from "../../application";

const logger = createLogger(import.meta.url);

export interface CmeSemanticModelContext {

  classes: CmeSemanticClass[];

  /**
   * Warning! This contains both semantic and profile generalizations.
   */
  generalizations: CmeSemanticGeneralization[];

  relationships: CmeSemanticRelationship[];

  models: CmeSemanticModel[];

  subscriptions: { [identifier: ModelDsIdentifier]: () => void };

}

const CmeSemanticModelContextReact =
  React.createContext<CmeSemanticModelContext>(null as any);

export const useCmeSemanticContext = (): CmeSemanticModelContext => {
  return useContext(CmeSemanticModelContextReact);
}

export function CmeSemanticModelContextProvider(
  props: {
    /**
     * The value must change if there is a new model.
     */
    semanticModels: Map<String, SemanticModel>,
    children: React.ReactNode,
  },
) {
  const [state, setState] = useState<CmeSemanticModelContext>({
    classes: [],
    generalizations: [],
    relationships: [],
    models: [],
    subscriptions: {},
  });

  const onEntitiesDidChange = useCallback((
    semanticModel: SemanticModel,
    updated: Record<string, SemanticEntity>,
    removed: string[],
  ) => {
    setState(prev => {
      const model = prev.models
        .find(item => item.identifier === semanticModel.getId());
      if (model === undefined) {
        logger.error("Ignoring cme-profile-model update for an unknown model",
          { models: prev.models, model: semanticModel.getId() });
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
    const semanticModels = [...props.semanticModels.values()];
    console.log("[CME-SEMANTIC-MODEL] Models have changed", semanticModels);
    setState(prev => updateModels(onEntitiesDidChange, prev, semanticModels));
  }, [setState, onEntitiesDidChange, props.semanticModels]);

  return (
    <CmeSemanticModelContextReact.Provider value={state}>
      {props.children}
    </CmeSemanticModelContextReact.Provider>
  )
}

function updateEntities(
  state: CmeSemanticModelContext,
  model: CmeSemanticModel,
  entities: SemanticEntity[],
): CmeSemanticModelContext {
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

function removeEntities<Type extends CmeSemanticEntity>(
  items: Type[],
  model: ModelDsIdentifier,
  removed: EntityDsIdentifier[],
): Type[] {
  return items.filter(
    item => item.model !== model || !removed.includes(item.identifier));
}

function updateModels(
  onEntitiesDidChange: (
    model: SemanticModel,
    updated: Record<string, SemanticEntity>,
    removed: string[]
  ) => void,
  prev: CmeSemanticModelContext,
  semanticModels: SemanticModel[],
): CmeSemanticModelContext {

  const models: CmeSemanticModel[] = [];
  const subscriptions: { [identifier: ModelDsIdentifier]: () => void } = {};

  // Collect removed models.
  const nextIdentifiers = semanticModels.map(item => item.getId());
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
      // Register for changes and store deregistration callback.
      subscriptions[identifier] = model.subscribeToChanges(
        (updated, removed) => onEntitiesDidChange(model, updated, removed));
    }
  }

  // Prepare new state.
  let result: CmeSemanticModelContext =
    removedModels.length === 0 ? {
      ...prev,
      models,
      subscriptions,
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

  addedModels.forEach(([model, cmeModel]) => {
    result = updateEntities(
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
