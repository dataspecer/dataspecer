import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { useNewFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useEffect } from "react";

/**
 * This hook creates a new federated observable store from the given semantic entities.
 */
export function useNewFederatedObservableStoreFromSemanticEntities(entities: SemanticModelEntity[] | null | undefined) {
  const store = useNewFederatedObservableStore();
  useEffect(() => {
    store.addModel("_temporaryModel", Object.fromEntries((entities ?? []).map((e) => [e.id, e])));
    return () => store.removeModel("_temporaryModel");
  }, [store, entities]);
  return store;
}
