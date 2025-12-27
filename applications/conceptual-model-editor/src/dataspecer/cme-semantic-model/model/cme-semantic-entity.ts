import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../../entity-model";

/**
 * Base interface for all semantic entities.
 */
export interface CmeSemanticEntity {

  type: string[];

  /**
   * Model this entity is from.
   */
  model: ModelDsIdentifier;

  /**
   * Entity identifier.
   */
  identifier: EntityDsIdentifier;

}
