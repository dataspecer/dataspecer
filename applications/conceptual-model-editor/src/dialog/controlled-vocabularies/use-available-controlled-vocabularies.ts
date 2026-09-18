import { useEffect, useState } from "react";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createControlledVocabularyManagerModelStore, type DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

const BACKEND_URL = import.meta.env.VITE_PUBLIC_APP_BACKEND!;

/**
 * Reads all currently tracked controlled vocabulary models from the store -
 * each model has exactly one entity, keyed by the model's own id.
 */
function readVocabularies(modelStore: DefaultFrontendModelStore): ControlledVocabulary[] {
  const result: ControlledVocabulary[] = [];
  for (const [modelId, entities] of Object.entries(modelStore.getAllEntities())) {
    const entity = entities[modelId] as ControlledVocabulary | undefined;
    if (entity) {
      result.push(entity);
    }
  }
  return result;
}

/**
 * Loads every controlled vocabulary available under the given package -
 * including ones in nested sub-packages - once, then keeps the result in
 * sync via subscription rather than reloading on every read.
 *
 * Read-only: this store is never written to from CME, which only assigns
 * vocabularies to class profiles, it does not author them.
 *
 * @param packageId the package to load controlled vocabularies for, or null
 *   while the currently open package is not yet known.
 */
export function useAvailableControlledVocabularies(packageId: string | null) {
  const [vocabularies, setVocabularies] = useState<ControlledVocabulary[]>([]);
  const [loading, setLoading] = useState(packageId !== null);

  useEffect(() => {
    if (packageId === null) {
      setVocabularies([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const store = createControlledVocabularyManagerModelStore({
      projectId: packageId,
      backendUrl: BACKEND_URL,
      httpFetch,
    });

    let cancelled = false;

    const unsubscribeEntityChanges = store.subscribeToEntityChanges(() => {
      setVocabularies(readVocabularies(store));
    });

    store
      .initialize()
      .then(() => store.waitForModelsToLoad())
      .then(() => {
        if (cancelled) return;
        setVocabularies(readVocabularies(store));
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load controlled vocabularies.", error);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribeEntityChanges();
    };
  }, [packageId]);

  return { vocabularies, loading };
}
