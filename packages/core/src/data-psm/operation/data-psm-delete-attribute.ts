import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteAttribute implements Operation {
  static readonly TYPE = PSM.DELETE_ATTRIBUTE;

  id: string;

  type: string;

  dataPsmOwner: string | null = null;

  entityId: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteAttribute.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteAttribute {
    return operation?.type === DataPsmDeleteAttribute.TYPE;
  }
}
