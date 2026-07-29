import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetPart implements Operation {
  static readonly TYPE = PSM.SET_PART;

  id: string;

  type: string;

  dataPsmAssociationEnd: string | null = null;

  dataPsmPart: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetPart.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetPart {
    return operation?.type === DataPsmSetPart.TYPE;
  }
}
