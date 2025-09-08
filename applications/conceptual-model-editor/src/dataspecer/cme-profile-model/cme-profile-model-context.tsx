import React, { useCallback, useContext, useEffect, useState } from "react";

import { ProfileEntity, ProfileModel } from "../profile-model";
import { ModelDsIdentifier } from "../entity-model";
import {
  CmeProfileModelState,
  createEmptyCmeProfileModelState,
  removeEntitiesFromProfileModel,
  updateEntitiesInProfileModel,
  updateProfileModels,
} from "./cme-profile-model-state";
import { createLogger } from "../../application";

const logger = createLogger(import.meta.url);

interface CmeProfileModelContext {

  state: CmeProfileModelState;

  subscriptions: Subscriptions;

}

type Subscriptions = { [identifier: ModelDsIdentifier]: () => void };

const CmeProfileModelContextReact =
  React.createContext<CmeProfileModelContext>(null as any);

export const useCmeProfileModelState = (): CmeProfileModelState => {
  return useContext(CmeProfileModelContextReact).state;
}

export function CmeProfileModelProvider(
  props: {
    /**
     * The value must change if there is a new model.
     */
    profileModels: Map<String, ProfileModel>,
    children: React.ReactNode,
  },
) {
  const [state, setState] = useState<CmeProfileModelContext>({
    state: createEmptyCmeProfileModelState(),
    subscriptions: {},
  });

  const onEntitiesDidChange = useCallback((
    profileModel: ProfileModel,
    updated: Record<string, ProfileEntity>,
    removed: string[],
  ) => {
    setState(prev => {
      const model = prev.state.models
        .find(item => item.identifier === profileModel.getId());
      if (model === undefined) {
        logger.error("Ignoring cme-profile-model update for an unknown model",
          { models: prev.state.models, model: profileModel.getId() });
        return prev;
      }
      //
      const state = removeEntitiesFromProfileModel(
        updateEntitiesInProfileModel(prev.state, model, Object.values(updated)),
        model.identifier, removed);
      return {
        ...prev,
        state,
      };
    });
  }, [setState]);

  useEffect(() => {
    const profileModels = [...props.profileModels.values()];
    setState(prev => {
      const subscriptions = updateSubscriptions(
        onEntitiesDidChange, prev, profileModels);
      const state = updateProfileModels(prev.state, profileModels);
      return {
        subscriptions,
        state,
      }
    });
  }, [setState, onEntitiesDidChange, props.profileModels]);

  return (
    <CmeProfileModelContextReact.Provider value={state}>
      {props.children}
    </CmeProfileModelContextReact.Provider>
  )
}

function updateSubscriptions(
  onEntitiesDidChange: (
    ProfileModel: ProfileModel,
    updated: Record<string, ProfileEntity>,
    removed: string[],
  ) => void,
  prev: CmeProfileModelContext,
  ProfileModels: ProfileModel[],
): Subscriptions {
  const subscriptions: Subscriptions = {};
  // Check previous models.
  const nextIdentifiers = ProfileModels.map(item => item.getId());
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
  for (const model of ProfileModels) {
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
