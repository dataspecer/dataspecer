import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetInterpretation implements Operation {
  static readonly TYPE = PSM.SET_INTERPRETATION;

  id: string;

  type: string;

  dataPsmResource: string | null = null;

  dataPsmInterpretation: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetInterpretation.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetInterpretation {
    return operation?.type === DataPsmSetInterpretation.TYPE;
  }
}
