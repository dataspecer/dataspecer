import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

export interface CmeProfileEntity {

  type: string[];

  model: ModelDsIdentifier;

  identifier: EntityDsIdentifier;

  readOnly: boolean;

}
