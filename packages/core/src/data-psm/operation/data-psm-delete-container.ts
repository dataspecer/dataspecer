import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteContainer implements Operation {
  static readonly TYPE = PSM.DELETE_CONTAINER;

  id: string;

  type: string;

  dataPsmOwner: string | null = null;

  entityId: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteContainer.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteContainer {
    return operation?.type === DataPsmDeleteContainer.TYPE;
  }
}
