import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmUnsetChoice implements Operation {
  static readonly TYPE = PSM.UNSET_CHOICE;

  id: string;

  type: string;

  dataPsmOr: string | null = null;

  dataPsmChoice: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmUnsetChoice.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmUnsetChoice {
    return operation?.type === DataPsmUnsetChoice.TYPE;
  }
}
