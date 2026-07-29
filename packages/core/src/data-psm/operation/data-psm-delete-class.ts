import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteClass implements Operation {
  static readonly TYPE = PSM.DELETE_CLASS;

  id: string;

  type: string;

  dataPsmClass: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteClass.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteClass {
    return operation?.type === DataPsmDeleteClass.TYPE;
  }
}
