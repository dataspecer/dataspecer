import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetInstancesHaveIdentity implements Operation {
  static readonly TYPE = PSM.SET_INSTANCES_HAVE_IDENTITY;

  id: string;

  type: string;

  dataPsmClass: string | null = null;

  /**
   * Whether instances of this class may/must/must not have identity, for example IRI.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesHaveIdentity: "ALWAYS" | "NEVER" | "OPTIONAL" | undefined = undefined;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetInstancesHaveIdentity.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetInstancesHaveIdentity {
    return operation?.type === DataPsmSetInstancesHaveIdentity.TYPE;
  }
}
