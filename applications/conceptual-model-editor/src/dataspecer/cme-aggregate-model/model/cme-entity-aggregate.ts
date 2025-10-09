import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

export interface CmeEntityAggregate {

  type: string;

  identifier: EntityDsIdentifier;

  /**
   * Identifier of a primary model where this entity belongs.
   * Use this to select a default color.
   */
  model: ModelDsIdentifier;

  /**
   * Identifiers of entities this entity aggregate depends on.
   */
  dependencies: EntityDsIdentifier[];

  /**
   * When true the entity is read only and can not be modified.
   */
  readOnly: boolean;

  iri: string | null;

}
