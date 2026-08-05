import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetDematerialized implements Operation {
  static readonly TYPE = PSM.SET_DEMATERIALIZED;

  id: string;

  type: string;

  dataPsmAssociationEnd: string | null = null;

  dataPsmIsDematerialized: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetDematerialized.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetDematerialized {
    return operation?.type === DataPsmSetDematerialized.TYPE;
  }
}
