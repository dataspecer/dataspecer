import { Entity } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { Profile } from "../concepts/profile.ts";

export function createObservableSemanticProfileAggregator()
  : ObservableSemanticProfileAggregator {
  return new DefaultObservableSemanticProfileAggregator();
}

export interface ObservableSemanticProfileAggregator {

  onEntityDidChange(entityChaneEvent: EntityChangeEvent<Entity>): void;

  subscribeToEntityChanges(
    listener: (entityChaneEvent: EntityChangeEvent<Profile>) => void,
  ): () => void

}

interface EntityChangeEvent<EntityType> {

  entityChanges: Record<ModelIdentifier, {
    previous: EntityType | null;
    next: EntityType | null;
  }[]>;

}

class DefaultObservableSemanticProfileAggregator
  implements ObservableSemanticProfileAggregator {

  onEntityDidChange(entityChaneEvent: EntityChangeEvent<Entity>): void {
    throw new Error("Method not implemented.");
  }

  subscribeToEntityChanges(
    listener: (entityChaneEvent: EntityChangeEvent<Profile>) => void,
  ): () => void {
    throw new Error("Method not implemented.");
  }

}

