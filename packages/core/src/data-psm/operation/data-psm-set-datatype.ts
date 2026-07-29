import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetDatatype implements Operation {
  static readonly TYPE = PSM.SET_DATATYPE;

  id: string;

  type: string;

  dataPsmAttribute: string | null = null;

  dataPsmDatatype: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetDatatype.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetDatatype {
    return operation?.type === DataPsmSetDatatype.TYPE;
  }
}
