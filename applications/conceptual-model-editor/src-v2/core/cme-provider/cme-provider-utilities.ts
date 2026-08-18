import { Entity } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import {
  EntitiesChangeEvent,
} from "../../infrastructure/dataspecer/dataspecer-package-api";

/**
 * Helper class to move from {@link EntitiesChangeEvent} to
 * {@link StateUpdate} interface.
 */
export class EventToStateUpdate<StateType> {

  private readonly wrapped: StateUpdate<StateType>;

  constructor(wrapped: StateUpdate<StateType>) {
    this.wrapped = wrapped;
  }

  onEntitiesDidChange(
    event: EntitiesChangeEvent,
  ) {
    for (const [model, changes] of Object.entries(event.entityChanges)) {
      for (const { previous, next } of Object.values(changes)) {
        if (previous !== null && next !== null) {
          this.wrapped.onUpdateEntity(model, previous, next);
        } else if (previous !== null) {
          this.wrapped.onRemoveEntity(model, previous);
        } else if (next !== null) {
          this.wrapped.onCreateEntity(model, next);
        }
      }
    }
  }

}

/**
 * Given a current state and changed in entities the objective is to
 * compute next state or return current if there is no change.
 * Implementation of this class thus work as an updater for the state.
 */
export interface StateUpdate<StateType> {

  onCreateEntity(
    model: ModelIdentifier, next: Entity): void;

  onUpdateEntity(
    model: ModelIdentifier, previous: Entity, next: Entity): void;

  onRemoveEntity(
    model: ModelIdentifier, previous: Entity): void;

  state(): StateType;

}

/**
 * Helper class to perform update on array of entities.
 */
export class UpdateArray<ItemType extends { id: string }> {

  private readonly previous: ItemType[];

  private readonly created: ItemType[] = [];

  private readonly changed: ItemType[] = [];

  private readonly removed: string[] = [];

  /**
   * @param previous Previous array state.
   * @param adapter
   */
  constructor(previous: ItemType[]) {
    this.previous = previous;
  }

  onCreateEntity(next: ItemType): void {
    this.created.push(next);
  }

  onUpdateEntity(next: ItemType): void {
    this.changed.push(next);
  }

  onRemoveEntityById(id: string): void {
    this.removed.push(id);
  }

  /**
   * If there is was no change return the given array.
   * Else return a new version of the array.
   */
  state(): ItemType[] {
    return updateArrayItemsByIdTo(
      this.created, this.changed, this.removed, this.previous);
  }

  /**
   * @returns Changes to the array.
   */
  change(): ArrayChange<ItemType> {
    return {
      created: this.created,
      changed: this.changed,
      removed: this.removed,
    }
  }

}

/**
 * @param changed New or changed items.
 * @param removed Identifiers to items to remove.
 * @param items
 * @returns
 */
function updateArrayItemsByIdTo<
  IdentifierType, Type extends { id: IdentifierType },
>(
  created: Type[],
  changed: Type[],
  removed: IdentifierType[],
  items: Type[],
): Type[] {
  if (created.length === 0 && changed.length === 0 && removed.length === 0) {
    return items;
  }
  // Create a copy of the array and perform modifications.
  let result = [...items];
  // Remove items.
  if (removed.length > 0) {
    result = result.filter(item => !removed.includes(item.id));
  }
  // Update existing
  for (const value of changed) {
    const index = items.findIndex(item => item.id === item.id);
    if (index === -1) {
      // This is sort of a fallback it should not be needed.
      items.push(value);
    } else {
      items[index] = value;
    }
  }
  // Add new items.
  if (created.length > 0) {
    result = [...result, ...created];
  }
  return result;
}

export interface ArrayChange<ItemType> {

  created: ItemType[];

  changed: ItemType[];

  removed: string[];

}

export const noChangeArray: ArrayChange<any> = Object.seal({
  created: [], changed: [], removed: []
});

/**
 * @returns Previous if all entries are the same.
 */
export function selectStable<Type extends object>(
  previous: Type, next: Type,
): Type {

  const previousKeys = Object.keys(previous) as (keyof Type)[];
  const nextKeys = Object.keys(next) as (keyof Type)[];

  if (previousKeys.length !== nextKeys.length) {
    return next;
  }

  for (const key of previousKeys) {
    if (!Object.is(previous[key], next[key])) {
      return next;
    }
  }

  return previous;
}
