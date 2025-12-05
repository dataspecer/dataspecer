import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";

export interface CmeSemanticEntity {

  type: string[];

  model: ModelDsIdentifier;

  identifier: EntityDsIdentifier;

  readOnly: boolean;

}
