import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

/**
 * Base entity for all semantic profile entities.
 */
export interface CmeProfileEntity {

  type: string[];

  model: ModelDsIdentifier;

  identifier: EntityDsIdentifier;

}
