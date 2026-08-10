import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteExternalRoot implements Operation {
  static readonly TYPE = PSM.DELETE_EXTERNAL_ROOT;

  id: string;

  type: string;

  entityId: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteExternalRoot.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteExternalRoot {
    return operation?.type === DataPsmDeleteExternalRoot.TYPE;
  }
}
