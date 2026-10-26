import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

/**
 * Creates {@link DataPsmInclude} to already existing class.
 */
export class DataPsmCreateInclude implements Operation {
  static readonly TYPE = PSM.CREATE_INCLUDE;

  id: string;

  type: string;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmOwner: string | null = null;

  dataPsmIncludes: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateInclude.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateInclude {
    return operation?.type === DataPsmCreateInclude.TYPE;
  }
}

export class DataPsmCreateIncludeResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_INCLUDE_RESULT;

  readonly createdDataPsmInclude: string;

  constructor(dataPsmInclude: string) {
    super();
    this.types.push(DataPsmCreateIncludeResult.TYPE);
    this.createdDataPsmInclude = dataPsmInclude;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateIncludeResult {
    return result?.types.includes(DataPsmCreateIncludeResult.TYPE) ?? false;
  }
}
