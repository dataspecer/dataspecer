import { generateOperationId, type Operation } from "../../operation/index.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetHumanLabel implements Operation {
  static readonly TYPE = PSM.SET_HUMAN_LABEL;

  id: string;

  type: string;

  dataPsmResource: string | null = null;

  dataPsmHumanLabel: LanguageString | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetHumanLabel.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetHumanLabel {
    return operation?.type === DataPsmSetHumanLabel.TYPE;
  }
}
