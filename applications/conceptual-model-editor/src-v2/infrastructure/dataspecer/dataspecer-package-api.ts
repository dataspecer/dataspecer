import { useEffect, useMemo, useState } from "react";

import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import {
  createCMEModelStore,
} from "@dataspecer/model-store/implementation";
import {
  RemoteModelStore
} from "@dataspecer/model-store/interfaces";
import { ModelIdentifier } from "@dataspecer/core/model";
import { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import {
  createObservableSemanticProfileAggregator
} from "@dataspecer/core-v2/semantic-model/profile/aggregator";
import { Logger } from "../logger/logger";
import {
  SubscriptionManager,
} from "../../shared/subscription-manager";

/**
 * @returns Connection to Dataspecer API.
 */
export function useCmeDataspecerPackageApi(
  /**
   * This is considered to be a a constant argument.
   * It must not change!
   */
  logger: Logger,
  /**
   * Identifier of a project to connect to.
   */
  project: string,
  /**
   * URL of a backend API to connect to.
   */
  backend: string,
  /**
   * HTTP fetch API to use for the connection.
   */
  httpFetch: HttpFetch,
): CmeDataspecerPackageApi {

  /** Aggregate profile entities. */
  const [profileAggregator] = useState(
    () => createObservableSemanticProfileAggregator());

  /** Provides ability to subscribe. */
  const [subscriptions] = useState(
    () => new SubscriptionManager<EntitiesChangeEvent>());

  const [store, setStore] = useState<RemoteModelStore | null>(null);

  const [status, setStatus] = useState<Status>("not-available");

  // Internal initialization.
  useEffect(() => {
    const unsubscribe: (() => void)[] = [];

    // Connect profileAggregator -> subscriptions.
    unsubscribe.push(profileAggregator.subscribeToEntityChanges(event => {
      subscriptions.notifyAll(event);
    }));

    // Cancel all subscriptions.
    return () => unsubscribe.forEach(fnc => fnc());
  }, []);

  // Initialize connection to Dataspecer API for given package.
  useEffect(() => {
    let canceled: boolean = false;

    const notifyListeners = (event: EntitiesChangeEvent) => {
      // Connect store -> profileAggregator
      profileAggregator.onEntityDidChange(event);
      // Connect store -> subscriptions
      subscriptions.notifyAll(event);
    };

    // Prepare connection to Dataspecer API.
    const store = createCMEModelStore({
      projectId: project,
      backendUrl: backend,
      httpFetch,
    });

    // We have a store and we are initializing.
    setStore(store);
    setStatus("initializing");

    // Connect store to all relevant listeners.
    const unsubscribe = store.subscribeToEntityChanges(notifyListeners);

    store.initialize().then(() => {
      if (canceled) {
        return;
      }
      // The store will not notify about the first batch of entities.
      // This contains information about models in the package.
      // As we may need them downstream we notify listeners on our own.
      const entities = store.getAllEntities();
      const event: EntitiesChangeEvent = {
        entityChanges: Object.fromEntries(
          Object.entries(entities).map(([model, items]) => [
            model,
            Object.values(items).map(item => ({ previous: null, next: item }))
          ])),
      };
      // Notify all listeners we have.
      notifyListeners(event);
      // Update status and for for it to load.
      setStatus("loading");
      return store.waitForModelsToLoad();
    }).then(() => {
      if (canceled) {
        return;
      }
      setStatus("ready");
    }).catch((error) => {
      if (canceled) {
        return;
      }
      logger.error("Failed to load all models.", { error });
      setStatus("error");
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [setStore, setStatus, subscriptions, project]);

  // Compute and return memoized API object.
  return useMemo<CmeDataspecerPackageApi>(() => {
    if (store === null) {
      return {
        status: status,
        subscribe: listener => subscriptions.subscribe(listener),
        // Store less implementation.
        getAllEntities: () => ({}),
        saveByOverride: () => Promise.resolve(),
      }
    }
    return {
      status: status,
      subscribe: listener => subscriptions.subscribe(listener),
      getAllEntities: () => store.getAllEntities(),
      saveByOverride: () => store.saveByOverride(),
    }
  }, [subscriptions, profileAggregator, store, status]);
}

type Status = "not-available" | "initializing" | "loading" | "ready" | "error";

export interface CmeDataspecerPackageApi {

  /**
   * Connection status.
   */
  status: Status;

  /**
   * Subscribe to entity changes.
   */
  subscribe: (listener: (event: EntitiesChangeEvent) => void) => () => void;

  /**
   * Return all non-derived entities in all models.
   */
  getAllEntities: () => Record<ModelIdentifier, EntityRecord>;

  /**
   * Save current state to backend overwriting any content there.
   */
  saveByOverride: () => Promise<void>;

}

export interface EntitiesChangeEvent {

  entityChanges: Record<ModelIdentifier, {
    previous: Entity | null;
    next: Entity | null;
  }[]>;

}

/*

// See https://github.com/dataspecer/dataspecer/blob/main/packages/model-store/README.md

modelStore.addOperationForTransaction([
  { modelId: semanticModelId, operation: createClass({ ... }) },
]);

*/
