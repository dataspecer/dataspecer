import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetOrder implements Operation {
  static readonly TYPE = PSM.SET_ORDER;

  id: string;

  type: string;

  dataPsmOwnerClass: string | null = null;

  dataPsmResourceToMove: string | null = null;

  /**
   * Set null to move to the first position.
   */
  dataPsmMoveAfter: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetOrder.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetOrder {
    return operation?.type === DataPsmSetOrder.TYPE;
  }
}
