import { Entity } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { SubscriptionManager } from "../../shared/subscription-manager";
import {
  ArrayChange,
  CmeProvider, EventToStateUpdate, selectStable, StateUpdate, UpdateArray,
} from "../../core/cme-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";
import {
  CmeVocabularyClass, CmeVocabularyGeneralization, CmeVocabularyRelation,
  isCmeVocabularyClass, isCmeVocabularyGeneralization, isCmeVocabularyRelation,
  wrapAsCmeVocabularyEntity,
} from "./cme-vocabulary-model";
import {
  isAggregatedProfiledSemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/profile/aggregator";

export function createCmeVocabularyProvider(): CmeProvider {
  return new CmeVocabularyProvider();
}

const CME_VOCABULARY_STATE_EVENT = "cme-vocabulary-provider-state";

/**
 * Publish a new version of the CME vocabulary state.
 */
export interface CmeVocabularyStateEvent {

  type: typeof CME_VOCABULARY_STATE_EVENT;

  classes: CmeVocabularyClass[];

  relationships: CmeVocabularyRelation[];

  generalizations: CmeVocabularyGeneralization[];

}

export function isCmeVocabularyStateEvent(
  value: { type: string },
): value is CmeVocabularyStateEvent {
  return value.type === CME_VOCABULARY_STATE_EVENT;
}

const CME_VOCABULARY_CHANGE_EVENT = "cme-vocabulary-provider-change";

export interface CmeVocabularyChangeEvent {

  type: typeof CME_VOCABULARY_CHANGE_EVENT;

  classes: ArrayChange<CmeVocabularyClass>;

  relationships: ArrayChange<CmeVocabularyRelation>;

  generalizations: ArrayChange<CmeVocabularyGeneralization>;

}

export function isCmeVocabularyChangeEvent(
  value: { type: string },
): value is CmeVocabularyChangeEvent {
  return value.type === CME_VOCABULARY_CHANGE_EVENT;
}

class CmeVocabularyProvider {

  private state: CmeVocabularyState = {
    classes: [],
    relationships: [],
    generalizations: [],
  };

  private readonly subscribers =
    new SubscriptionManager<{ type: string }>();

  onEntitiesDidChange(event: EntitiesChangeEvent) {
    const update = new CmeVocabularyUpdate(this.state);
    (new EventToStateUpdate(update)).onEntitiesDidChange(event);
    // Update state.
    const next = update.state();
    if (next === this.state) {
      return;
    }
    this.state = next;
    // Notify about change.
    const changeEvent: CmeVocabularyChangeEvent = {
      type: CME_VOCABULARY_CHANGE_EVENT,
      classes: update.classes.change(),
      relationships: update.relationships.change(),
      generalizations: update.generalizations.change(),
    };
    this.subscribers.notifyAll(changeEvent);
    // Notify about the new state.
    const stateEvent: CmeVocabularyStateEvent = {
      type: CME_VOCABULARY_STATE_EVENT,
      classes: next.classes,
      relationships: next.relationships,
      generalizations: next.generalizations,
    };
    this.subscribers.notifyAll(stateEvent);
  }

  subscribe(subscriber: (value: { type: string }) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

interface CmeVocabularyState {

  classes: CmeVocabularyClass[];

  relationships: CmeVocabularyRelation[];

  generalizations: CmeVocabularyGeneralization[];

}

/**
 * Update {@link CmeVocabularyState} in reaction to changes in entities.
 */
class CmeVocabularyUpdate implements StateUpdate<CmeVocabularyState> {

  readonly previous: CmeVocabularyState;

  readonly classes: UpdateArray<CmeVocabularyClass>;

  readonly relationships: UpdateArray<CmeVocabularyRelation>;

  readonly generalizations: UpdateArray<CmeVocabularyGeneralization>;

  constructor(state: CmeVocabularyState) {
    this.previous = state;
    this.classes = new UpdateArray(state.classes);
    this.relationships = new UpdateArray(state.relationships);
    this.generalizations = new UpdateArray(state.generalizations);
  }

  onCreateEntity(model: ModelIdentifier, next: Entity): void {
    // A generalization is same for vocabulary as well as profile.
    // As a result, it is almost the same for an aggregated.
    // We do not want to process profiles or aggregates here.
    if (isAggregatedProfiledSemanticModelEntity(next)) {
      return;
    }
    //
    wrapAsCmeVocabularyEntity(model, next).forEach(entity => {
      if (isCmeVocabularyClass(entity)) {
        this.classes.onCreateEntity(entity);
      } else if (isCmeVocabularyRelation(entity)) {
        this.relationships.onCreateEntity(entity)
      } else if (isCmeVocabularyGeneralization(entity)) {
        this.generalizations.onCreateEntity(entity)
      }
    });
  }

  onUpdateEntity(model: ModelIdentifier, _previous: Entity, next: Entity): void {
    // A generalization is same for vocabulary as well as profile.
    // As a result, it is almost the same for an aggregated.
    // We do not want to process profiles or aggregates here.
    if (isAggregatedProfiledSemanticModelEntity(next)) {
      return;
    }
    //
    wrapAsCmeVocabularyEntity(model, next).forEach(entity => {
      if (isCmeVocabularyClass(entity)) {
        this.classes.onUpdateEntity(entity);
      } else if (isCmeVocabularyRelation(entity)) {
        this.relationships.onUpdateEntity(entity)
      } else if (isCmeVocabularyGeneralization(entity)) {
        this.generalizations.onUpdateEntity(entity)
      }
    });
  }

  onRemoveEntity(model: ModelIdentifier, previous: Entity): void {
    // A generalization is same for vocabulary as well as profile.
    // As a result, it is almost the same for an aggregated.
    // We do not want to process profiles or aggregates here.
    if (isAggregatedProfiledSemanticModelEntity(previous)) {
      return;
    }
    //
    wrapAsCmeVocabularyEntity(model, previous).forEach(entity => {
      if (isCmeVocabularyClass(entity)) {
        this.classes.onRemoveEntityById(entity.id);
      } else if (isCmeVocabularyRelation(entity)) {
        this.relationships.onRemoveEntityById(entity.id)
      } else if (isCmeVocabularyGeneralization(entity)) {
        this.generalizations.onRemoveEntityById(entity.id)
      }
    });
  }

  state(): CmeVocabularyState {
    const next: CmeVocabularyState = {
      ...this.previous,
      classes: this.classes.state(),
      relationships: this.relationships.state(),
      generalizations: this.generalizations.state(),
    };
    return selectStable(this.previous, next);
  }

}
