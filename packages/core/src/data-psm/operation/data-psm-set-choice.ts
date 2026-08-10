import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetChoice implements Operation {
  static readonly TYPE = PSM.SET_CHOICE;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmChoice: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetChoice.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetChoice {
    return operation?.type === DataPsmSetChoice.TYPE;
  }
}
