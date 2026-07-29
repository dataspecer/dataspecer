import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetInstancesSpecifyTypes implements Operation {
  static readonly TYPE = PSM.SET_INSTANCES_SPECIFY_TYPES;

  id: string;

  type: string;

  dataPsmClass: string | null = null;

  /**
   * Require explicit instance typing. For example as @type property in JSON-LD.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesSpecifyTypes: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetInstancesSpecifyTypes.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetInstancesSpecifyTypes {
    return operation?.type === DataPsmSetInstancesSpecifyTypes.TYPE;
  }
}
