import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Removes {@link DataPsmOr} and places its only child in place of it.
 */
export class DataPsmUnwrapOr implements Operation {
  static readonly TYPE = PSM.UNWRAP_OR;

  id: string;

  type: string;

  entityId: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmUnwrapOr.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmUnwrapOr {
    return operation?.type === DataPsmUnwrapOr.TYPE;
  }
}

export class DataPsmUnwrapOrResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.UNWRAP_OR_RESULT;

  constructor() {
    super();
    this.types.push(DataPsmUnwrapOrResult.TYPE);
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmUnwrapOrResult {
    return result?.types.includes(DataPsmUnwrapOrResult.TYPE) ?? false;
  }
}
