import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

export class DataPsmCreateOr implements Operation {
  static readonly TYPE = PSM.CREATE_OR;

  id: string;

  type: string;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmChoices: string[] = [];

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateOr.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateOr {
    return operation?.type === DataPsmCreateOr.TYPE;
  }
}

export class DataPsmCreateOrResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_OR_RESULT;

  readonly createdDataPsmOr: string;

  constructor(dataPsmOr: string) {
    super();
    this.types.push(DataPsmCreateOrResult.TYPE);
    this.createdDataPsmOr = dataPsmOr;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateOrResult {
    return result?.types.includes(DataPsmCreateOrResult.TYPE) ?? false;
  }
}
