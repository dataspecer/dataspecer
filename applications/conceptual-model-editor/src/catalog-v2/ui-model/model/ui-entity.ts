import { EntityDsIdentifier } from "../../../dataspecer/entity-model";
import { UiSemanticModel } from "./ui-semantic-model";

export const UI_UNKNOWN_ENTITY_TYPE = "ui-unknown-entity-type";

/**
 * Base interface for UI entities.
 */
export interface UiEntity {

  type: string;

  /**
   * We store direct reference to model here.
   * As the model should not change too often this should be fine.
   */
  model: UiSemanticModel;

  /**
   * Entity identifier.
   */
  identifier: EntityDsIdentifier;

  /**
   * Short label representing the entity in the user interface.
   */
  label: string;

  /**
   * Entity is hardcoded.
   */
  buildIn?: boolean;
}
