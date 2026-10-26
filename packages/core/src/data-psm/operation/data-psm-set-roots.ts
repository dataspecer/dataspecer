import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetRoots implements Operation {
  static readonly TYPE = PSM.SET_ROOTS;

  id: string;

  type: string;

  /**
   * New value of the schema roots property.
   */
  dataPsmRoots: string[] = [];

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetRoots.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetRoots {
    return operation?.type === DataPsmSetRoots.TYPE;
  }
}
