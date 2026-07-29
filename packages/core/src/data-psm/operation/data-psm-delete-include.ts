import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteInclude implements Operation {
  static readonly TYPE = PSM.DELETE_INCLUDE;

  id: string;

  type: string;

  dataPsmOwner: string | null = null;

  dataPsmInclude: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteInclude.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteInclude {
    return operation?.type === DataPsmDeleteInclude.TYPE;
  }
}
