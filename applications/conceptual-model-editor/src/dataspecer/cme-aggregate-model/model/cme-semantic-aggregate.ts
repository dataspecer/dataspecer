import { ModelDsIdentifier } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";

export interface CmeSemanticAggregate extends CmeEntityAggregate {

  /**
   * Semantic model with definition of this entity.
   */
  semanticModels: ModelDsIdentifier[];

}
