import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteOr implements Operation {
  static readonly TYPE = PSM.DELETE_OR;

  id: string;

  type: string;

  dataPsmOr: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteOr.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteOr {
    return operation?.type === DataPsmDeleteOr.TYPE;
  }
}
