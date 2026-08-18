import { EntityIdentifier } from "@dataspecer/core/entity-model"
import { ModelIdentifier } from "@dataspecer/core/model";

/**
 * Holds application wide stat consumed by multiple components.
 */
export interface ApplicationState {

  /**
   * Current active selection.
   * This may include entities that no longer exists.
   * Any consumer should silently ignore non-existing selected items.
   */
  selection: SelectedEntity[];

}

/**
 * Reference to a selected entity.
 */
export interface SelectedEntity {

  entity: EntityIdentifier;

  model: ModelIdentifier;

}

export function createApplicationState(): ApplicationState {
  return {
    selection: [],
  };
}
