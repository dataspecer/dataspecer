import {
  isAggregatedProfiledSemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/profile/aggregator";
import {
  isSemanticModelClassProfile, isSemanticModelGeneralizationProfile,
  isSemanticModelRelationshipProfile, SemanticModelClassProfile,
  SemanticModelGeneralizationProfile, SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { Logger } from "../../infrastructure/logger";
import { SubscriptionManager } from "../../shared/subscription-manager";
import {
  CmeProvider, EventToStateUpdate, selectStable, StateUpdate, UpdateArray,
} from "../../core/cme-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";

export function createCmeProfileProvider(
  { logger }: { logger: Logger },
): CmeProfileProvider {
  return new DefaultCmeProfileProvider(logger);
}

export interface CmeProfileProvider extends CmeProvider {

  onEntitiesDidChange(event: EntitiesChangeEvent): void;

  subscribe(subscriber: (value: CmeProfileEvent) => void): () => void;

}

const CME_PROFILE_STATE_TYPE = "cme-profile-provider-state";

export interface CmeProfileEvent {

  type: typeof CME_PROFILE_STATE_TYPE;

  classes: SemanticModelClassProfile[];

  relationship: SemanticModelRelationshipProfile[];

  generalizations: SemanticModelGeneralizationProfile[];

  entityToModel: { [entity: EntityIdentifier]: ModelIdentifier };

}

export function isCmeProfileEvent(
  value: { type: string },
): value is CmeProfileEvent {
  return value.type === CME_PROFILE_STATE_TYPE;
}

class DefaultCmeProfileProvider implements CmeProfileProvider {

  private state: CmeProfileEvent = {
    type: CME_PROFILE_STATE_TYPE,
    classes: [],
    relationship: [],
    generalizations: [],
    entityToModel: {},
  };

  private readonly logger: Logger;

  private readonly subscribers = new SubscriptionManager<CmeProfileEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  onEntitiesDidChange(event: EntitiesChangeEvent) {
    const update = new CmeSemanticProfileUpdate(this.state);
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

  subscribe(subscriber: (value: CmeProfileEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

class CmeSemanticProfileUpdate implements StateUpdate<CmeProfileEvent> {

  readonly previous: CmeProfileEvent;

  readonly classes: UpdateArray<SemanticModelClassProfile>;

  readonly relationship: UpdateArray<SemanticModelRelationshipProfile>;

  readonly generalizations: UpdateArray<SemanticModelGeneralizationProfile>;

  readonly entityToModel: { [entity: EntityIdentifier]: ModelIdentifier };

  readonly removedEntities: EntityIdentifier[];

  constructor(state: CmeProfileEvent) {
    this.previous = state;
    this.classes = new UpdateArray(state.classes);
    this.relationship = new UpdateArray(state.relationship);
    this.generalizations = new UpdateArray(state.generalizations);
    this.entityToModel = {};
    this.removedEntities = [];
  }

  onCreateEntity(model: ModelIdentifier, next: Entity): void {
    // We ignore aggregates.
    if (isAggregatedProfiledSemanticModelEntity(next)) {
      return;
    }
    if (isSemanticModelClassProfile(next)) {
      this.classes.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
    if (isSemanticModelRelationshipProfile(next)) {
      this.relationship.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
    if (isSemanticModelGeneralizationProfile(next)) {
      this.generalizations.onCreateEntity(next);
      this.entityToModel[next.id] = model;
    }
  }

  onUpdateEntity(_: ModelIdentifier, _previous: Entity, next: Entity): void {
    // We ignore aggregates.
    if (isAggregatedProfiledSemanticModelEntity(next)) {
      return;
    }
    if (isSemanticModelClassProfile(next)) {
      this.classes.onUpdateEntity(next);
    }
    if (isSemanticModelRelationshipProfile(next)) {
      this.relationship.onUpdateEntity(next);
    }
    if (isSemanticModelGeneralizationProfile(next)) {
      this.generalizations.onUpdateEntity(next);
    }
  }

  onRemoveEntity(_: ModelIdentifier, previous: Entity): void {
    // We ignore aggregates.
    if (isAggregatedProfiledSemanticModelEntity(previous)) {
      return;
    }
    if (isSemanticModelClassProfile(previous)) {
      this.classes.onRemoveEntityById(previous.id);
    }
    if (isSemanticModelRelationshipProfile(previous)) {
      this.relationship.onRemoveEntityById(previous.id);
    }
    if (isSemanticModelGeneralizationProfile(previous)) {
      this.generalizations.onRemoveEntityById(previous.id);
    }
    this.removedEntities.push(previous.id);
  }

  state(): CmeProfileEvent {
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
    const next: CmeProfileEvent = {
      ...this.previous,
      classes: this.classes.state(),
      relationship: this.relationship.state(),
      generalizations: this.generalizations.state(),
      entityToModel,
    };
    return selectStable(this.previous, next);
  }

}
