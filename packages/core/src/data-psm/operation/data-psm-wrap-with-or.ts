import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

/**
 * Wraps {@link DataPsmClass}, {@link DataPsmClassReference} or
 * {@link DataPsmOr} into newly created {@link DataPsmOr}
 */
export class DataPsmWrapWithOr implements Operation {
  static readonly TYPE = PSM.WRAP_WITH_OR;

  id: string;

  type: string;

  /**
   * IRI of the newly created DataPsmOr, generated up-front so that callers
   * can use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  /**
   * The wrapped resource
   */
  dataPsmChild: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmWrapWithOr.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmWrapWithOr {
    return operation?.type === DataPsmWrapWithOr.TYPE;
  }
}

export class DataPsmWrapWithOrResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.WRAP_WITH_OR_RESULT;

  readonly createdDataPsmOr: string;

  constructor(dataPsmOr: string) {
    super();
    this.types.push(DataPsmWrapWithOrResult.TYPE);
    this.createdDataPsmOr = dataPsmOr;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmWrapWithOrResult {
    return result?.types.includes(DataPsmWrapWithOrResult.TYPE) ?? false;
  }
}
