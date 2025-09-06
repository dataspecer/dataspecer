import React, { useCallback, useContext, useEffect, useState } from "react";

import { SemanticEntity, SemanticModel } from "../semantic-model";
import { ModelDsIdentifier } from "../entity-model";
import {
  CmeSemanticModelState,
  createEmptyCmeSemanticModelState,
  removeEntitiesFromModel,
  updateEntitiesInModel,
  updateSemanticModels,
} from "./cme-semantic-model-state";
import { createLogger } from "../../application";

const logger = createLogger(import.meta.url);

export interface CmeSemanticModelContext {

  state: CmeSemanticModelState;

  subscriptions: Subscriptions;

}

type Subscriptions = { [identifier: ModelDsIdentifier]: () => void };

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
    state: createEmptyCmeSemanticModelState(),
    subscriptions: {},
  });

  const onEntitiesDidChange = useCallback((
    semanticModel: SemanticModel,
    updated: Record<string, SemanticEntity>,
    removed: string[],
  ) => {
    setState(prev => {
      const model = prev.state.models
        .find(item => item.identifier === semanticModel.getId());
      if (model === undefined) {
        logger.error("Ignoring cme-profile-model update for an unknown model",
          { models: prev.state.models, model: semanticModel.getId() });
        return prev;
      }
      //
      const state = removeEntitiesFromModel(
        updateEntitiesInModel(prev.state, model, Object.values(updated)),
        model.identifier, removed);
      return {
        ...prev,
        state,
      };
    });
  }, [setState]);

  useEffect(() => {
    const semanticModels = [...props.semanticModels.values()];
    setState(prev => {
      const subscriptions = updateSubscriptions(
        onEntitiesDidChange, prev, semanticModels);
      const state = updateSemanticModels(
        prev.state, semanticModels);
      return {
        subscriptions,
        state,
      }
    });
  }, [setState, onEntitiesDidChange, props.semanticModels]);

  return (
    <CmeSemanticModelContextReact.Provider value={state}>
      {props.children}
    </CmeSemanticModelContextReact.Provider>
  )
}

function updateSubscriptions(
  onEntitiesDidChange: (
    semanticModel: SemanticModel,
    updated: Record<string, SemanticEntity>,
    removed: string[],
  ) => void,
  prev: CmeSemanticModelContext,
  semanticModels: SemanticModel[],
): Subscriptions {
  const subscriptions: Subscriptions = {};
  // Check previous models.
  const nextIdentifiers = semanticModels.map(item => item.getId());
  for (const model of prev.state.models) {
    const identifier = model.identifier;
    if (nextIdentifiers.includes(identifier)) {
      // We keep the model.
      subscriptions[identifier] = prev.subscriptions[identifier];
    } else {
      // We unsubscribe.
      prev.subscriptions[identifier]();
    }
  }
  // Check new models.
  const prevIdentifiers = prev.state.models.map(item => item.identifier);
  for (const model of semanticModels) {
    const identifier = model.getId()
    if (prevIdentifiers.includes(identifier)) {
      // Known model.
      continue;
    } else {
      // This is a new model.
      subscriptions[identifier] = model.subscribeToChanges(
        (updated, removed) => onEntitiesDidChange(model, updated, removed));
    }
  }
  return subscriptions;
}
