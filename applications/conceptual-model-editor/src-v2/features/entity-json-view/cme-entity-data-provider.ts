import { ModelIdentifier } from "@dataspecer/core/model";
import { EntityRecord } from "@dataspecer/core/entity-model";
import {
  isAggregatedProfiledSemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/profile/aggregator";

import { Logger } from "../../infrastructure/logger";
import { SubscriptionManager } from "../../shared/subscription-manager";
import { CmeProvider, CmeProviderEvent } from "../../core/cme-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";

export function createCmeEntityDataProvider(
  { logger }: { logger: Logger },
): CmeEntityDataProvider {
  return new DefaultCmeEntityDataProvider(logger);
}

export interface CmeEntityDataProvider extends CmeProvider {

  onEntitiesDidChange(event: EntitiesChangeEvent): void;

}

export const CME_ENTITY_DATA_STATE_TYPE = "cme-entity-data-provider-state";

/**
 * Mirrors the raw, untyped entities per model.
 * This provide access to raw content and fallback option.
 *
 * Since aggregates share the same identification they are in an separate
 * collection.
 */
export interface CmeEntityDataStateEvent extends CmeProviderEvent {

  type: typeof CME_ENTITY_DATA_STATE_TYPE;

  entities: Record<ModelIdentifier, EntityRecord>;

  aggregates: Record<ModelIdentifier, EntityRecord>;

}

export function isCmeEntityDataStateEvent(
  value: { type: string },
): value is CmeEntityDataStateEvent {
  return value.type === CME_ENTITY_DATA_STATE_TYPE;
}

class DefaultCmeEntityDataProvider implements CmeEntityDataProvider {

  private state: CmeEntityDataStateEvent = {
    type: CME_ENTITY_DATA_STATE_TYPE,
    entities: {},
    aggregates: {},
  };

  private readonly logger: Logger;

  private readonly subscribers = new SubscriptionManager<CmeProviderEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  onEntitiesDidChange(event: EntitiesChangeEvent): void {
    const entities = { ...this.state.entities };
    const aggregates = { ...this.state.aggregates };
    for (const [model, changes] of Object.entries(event.entityChanges)) {
      const modelEntities = { ...(entities[model] ?? {}) };
      const modelAggregates = { ...(aggregates[model] ?? {}) };
      for (const { previous, next } of changes) {
        const reference = next ?? previous;
        const target = reference !== null
          && isAggregatedProfiledSemanticModelEntity(reference)
          ? modelAggregates : modelEntities;
        if (next !== null) {
          target[next.id] = next;
        } else if (previous !== null) {
          delete target[previous.id];
        }
      }
      entities[model] = modelEntities;
      aggregates[model] = modelAggregates;
    }
    this.state = { ...this.state, entities, aggregates };
    this.subscribers.notifyAll(this.state);
  }

  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}
