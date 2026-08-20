import { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { Logger } from "../../infrastructure/logger";
import { SubscriptionManager } from "../../shared/subscription-manager";
import {
  CmeProvider, EventToStateUpdate, selectStable, StateUpdate, UpdateArray,
} from "../../core/cme-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";
import {
  AggregatedProfiledSemanticModelClass,
  AggregatedProfiledSemanticModelRelationship,
  AggregatedProfileSemanticModelGeneralization,
  isAggregatedProfiledSemanticModelClass,
  isAggregatedProfiledSemanticModelRelationship,
  isAggregatedProfileSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/profile/aggregator";

export function createCmeProfileAggregateProvider(
  { logger }: { logger: Logger },
): CmeProfileAggregateProvider {
  return new DefaultCmeProfileAggregateProvider(logger);
}

export interface CmeProfileAggregateProvider extends CmeProvider {

  onEntitiesDidChange(event: EntitiesChangeEvent): void;

  subscribe(subscriber: (value: CmeProfileAggregateEvent) => void): () => void;

}

const CME_PROFILE_AGGREGATE_STATE_TYPE = "cme-profile-aggregate-provider-state";

export interface CmeProfileAggregateEvent {

  type: typeof CME_PROFILE_AGGREGATE_STATE_TYPE;

  classes: AggregatedProfiledSemanticModelClass[];

  relationship: AggregatedProfiledSemanticModelRelationship[];

  generalizations: AggregatedProfileSemanticModelGeneralization[];

  entityToModel: { [entity: EntityIdentifier]: ModelIdentifier };

}

export function isCmeProfileAggregateEvent(
  value: { type: string },
): value is CmeProfileAggregateEvent {
  return value.type === CME_PROFILE_AGGREGATE_STATE_TYPE;
}

class DefaultCmeProfileAggregateProvider implements CmeProfileAggregateProvider {

  private state: CmeProfileAggregateEvent = {
    type: CME_PROFILE_AGGREGATE_STATE_TYPE,
    classes: [],
    relationship: [],
    generalizations: [],
    entityToModel: {},
  };

  constructor(_logger: Logger) {
  }

  private readonly subscribers = new SubscriptionManager<CmeProfileAggregateEvent>();

  onEntitiesDidChange(event: EntitiesChangeEvent) {
    const update = new CmeSemanticProfileAggregateUpdate(this.state);
    (new EventToStateUpdate(update)).onEntitiesDidChange(event);
    // Update state.
    const next = update.state();
    if (next === this.state) {
      return;
    }
    this.state = next;
    // Notify listeners about a new state.
    this.subscribers.notifyAll(this.state);
  }

  subscribe(subscriber: (value: CmeProfileAggregateEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

class CmeSemanticProfileAggregateUpdate implements StateUpdate<CmeProfileAggregateEvent> {

  readonly previous: CmeProfileAggregateEvent;

  readonly classes: UpdateArray<AggregatedProfiledSemanticModelClass>;

  readonly relationship: UpdateArray<AggregatedProfiledSemanticModelRelationship>;

  readonly generalizations: UpdateArray<AggregatedProfileSemanticModelGeneralization>;

  readonly entityToModel: { [entity: EntityIdentifier]: ModelIdentifier };

  readonly removedEntities: EntityIdentifier[];

  constructor(state: CmeProfileAggregateEvent) {
    this.previous = state;
    this.classes = new UpdateArray(state.classes);
    this.relationship = new UpdateArray(state.relationship);
    this.generalizations = new UpdateArray(state.generalizations);
    this.entityToModel = {};
    this.removedEntities = [];
  }

  onCreateEntity(model: ModelIdentifier, next: Entity): void {
    if (isAggregatedProfiledSemanticModelClass(next)) {
      this.classes.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
    if (isAggregatedProfiledSemanticModelRelationship(next)) {
      this.relationship.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
    if (isAggregatedProfileSemanticModelGeneralization(next)) {
      this.generalizations.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
  }

  onUpdateEntity(_: ModelIdentifier, _previous: Entity, next: Entity): void {
    if (isAggregatedProfiledSemanticModelClass(next)) {
      this.classes.onUpdateEntity(next);
    }
    if (isAggregatedProfiledSemanticModelRelationship(next)) {
      this.relationship.onUpdateEntity(next);
    }
    if (isAggregatedProfileSemanticModelGeneralization(next)) {
      this.generalizations.onUpdateEntity(next);
    }
  }

  onRemoveEntity(_: ModelIdentifier, previous: Entity): void {
    if (isAggregatedProfiledSemanticModelClass(previous)) {
      this.classes.onRemoveEntityById(previous.id);
    }
    if (isAggregatedProfiledSemanticModelRelationship(previous)) {
      this.relationship.onRemoveEntityById(previous.id);
    }
    if (isAggregatedProfileSemanticModelGeneralization(previous)) {
      this.generalizations.onRemoveEntityById(previous.id);
    }
    this.removedEntities.push(previous.id);
  }

  state(): CmeProfileAggregateEvent {
    let entityToModel = this.previous.entityToModel;
    if (Object.values(this.entityToModel).length > 0) {
      entityToModel = {
        ...entityToModel,
        ...this.entityToModel,
      };
    }
    if (this.removedEntities.length > 0) {
      entityToModel = { ...entityToModel };
      this.removedEntities.forEach(id => delete entityToModel[id]);
    }
    const next: CmeProfileAggregateEvent = {
      ...this.previous,
      classes: this.classes.state(),
      relationship: this.relationship.state(),
      generalizations: this.generalizations.state(),
      entityToModel,
    };
    return selectStable(this.previous, next);
  }

}
