import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetCardinality implements Operation {
  static readonly TYPE = PSM.SET_CARDINALITY;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmCardinality: [number, number | null] | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetCardinality.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetCardinality {
    return operation?.type === DataPsmSetCardinality.TYPE;
  }
}
