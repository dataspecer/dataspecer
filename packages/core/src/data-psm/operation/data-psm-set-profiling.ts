import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetProfiling implements Operation {
  static readonly TYPE = PSM.SET_PROFILING;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmProfiling: string[] | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetProfiling.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetProfiling {
    return operation?.type === DataPsmSetProfiling.TYPE;
  }
}
