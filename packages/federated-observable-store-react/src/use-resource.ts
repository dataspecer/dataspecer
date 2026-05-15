import { Entity } from "@dataspecer/core-v2";
import { CoreResource } from "@dataspecer/core/core";
import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { StoreContext } from "./store.ts";

/**
 * Returns resource data if available, with info, whether the resource is being
 * loaded. It automatically re-renders the component, if the resource has
 * changed, either by operation, or store manipulation.
 *
 * @param iri
 */
export const useResource = <ResourceType extends CoreResource | Entity = CoreResource>(iri: string | null) => {
  const store = useContext(StoreContext);

  const getSnapshot = useCallback(() => store.readResource(iri) as ResourceType | null, [store, iri]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      store.addSubscriber(iri, onStoreChange);
      return () => store.removeSubscriber(iri, onStoreChange);
    },
    [store, iri],
  );

  const entity = useSyncExternalStore(subscribe, getSnapshot);

  const wrappedEntity = useMemo(
    () => ({
      resource: entity,
      isLoading: false,
    }),
    [entity],
  );

  return wrappedEntity;
};
