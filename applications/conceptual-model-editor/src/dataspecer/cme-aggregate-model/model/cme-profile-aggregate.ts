import { ModelDsIdentifier } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";

export interface CmeProfileAggregate extends CmeEntityAggregate {

  /**
   * Profile models with definition of this entity.
   */
  profileModels: ModelDsIdentifier[];

}
