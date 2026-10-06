import { EntityIdentifier } from "@dataspecer/core/entity-model"
import { ModelIdentifier } from "@dataspecer/core/model";
import { SelectedEntity } from "./application-state";

export interface SelectionApi {

  /**
   * Toggle selection for an item.
   */
  toggle: (model: ModelIdentifier, entity: EntityIdentifier) => void;

  /**
   * Toggle selection for an item with shift key down.
   * This enable selection of multiple items.
   */
  toggleWithShift: (model: ModelIdentifier, entity: EntityIdentifier) => void;

  /**
   * Set selection to given entities.
   */
  set: (items: SelectedEntity[]) => void;

}
