import { EntityDsIdentifier } from "../../entity-model";

export interface CmeEntityAggregate {

  type: string;

  identifier: EntityDsIdentifier;

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
