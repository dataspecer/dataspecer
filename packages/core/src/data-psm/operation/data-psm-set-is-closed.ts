import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetIsClosed implements Operation {
  static readonly TYPE = PSM.SET_IS_CLOSED;

  id: string;

  type: string;

  dataPsmClass: string | null = null;

  dataPsmIsClosed: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetIsClosed.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetIsClosed {
    return operation?.type === DataPsmSetIsClosed.TYPE;
  }
}
