import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetTechnicalLabel implements Operation {
  static readonly TYPE = PSM.SET_TECHNICAL_LABEL;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmTechnicalLabel: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetTechnicalLabel.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetTechnicalLabel {
    return operation?.type === DataPsmSetTechnicalLabel.TYPE;
  }
}
