import { useContext, useEffect, useState } from "react";
import type { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { ModelStoreContext } from "./model-store-context.ts";

/**
 * Returns the entity with the given id from the given model, or null if it
 * does not exist (model not loaded/active, entity not found, or the model
 * store itself is not yet available).
 *
 * Re-renders only when this specific entity changes: on each store
 * notification, the (model-scoped) list of changes is scanned for one
 * matching `entityId`, and the new state is taken directly from that change
 * instead of re-reading the whole model.
 */
export function useModelStoreEntity<EntityType extends Entity = Entity>(
  modelId: ModelIdentifier | null | undefined,
  entityId: EntityIdentifier | null | undefined,
): EntityType | null {
  const store = useContext(ModelStoreContext);

  const [entity, setEntity] = useState<EntityType | null>(null);

  useEffect(() => {
    if (!store || !modelId || !entityId) {
      setEntity(null);
      return;
    }

    setEntity(store.getEntity(modelId, entityId) as EntityType | null);

    return store.subscribeToEntityChanges((event) => {
      const changes = event.entityChanges[modelId];
      if (!changes) {
        return;
      }
      for (const change of changes) {
        if ((change.next?.id ?? change.previous?.id) === entityId) {
          setEntity(change.next as EntityType | null);
          break;
        }
      }
    });
  }, [store, modelId, entityId]);

  return entity;
}
