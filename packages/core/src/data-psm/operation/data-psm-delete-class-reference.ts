import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteClassReference implements Operation {
  static readonly TYPE = PSM.DELETE_CLASS_REFERENCE;

  id: string;

  type: string;

  entityId: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteClassReference.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteClassReference {
    return operation?.type === DataPsmDeleteClassReference.TYPE;
  }
}
