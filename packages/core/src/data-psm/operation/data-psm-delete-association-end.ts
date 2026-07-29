import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteAssociationEnd implements Operation {
  static readonly TYPE = PSM.DELETE_ASSOCIATION_END;

  id: string;

  type: string;

  dataPsmOwner: string | null = null;

  dataPsmAssociationEnd: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmDeleteAssociationEnd.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmDeleteAssociationEnd {
    return operation?.type === DataPsmDeleteAssociationEnd.TYPE;
  }
}
