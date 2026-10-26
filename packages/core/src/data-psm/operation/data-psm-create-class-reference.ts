import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

export class DataPsmCreateClassReference implements Operation {
  static readonly TYPE = PSM.CREATE_CLASS_REFERENCE;

  id: string;

  type: string;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  /**
   * IRI of a specification.
   */
  dataPsmSpecification: string | null = null;

  /**
   * IRI of the PSM class.
   */
  dataPsmClass: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateClassReference.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateClassReference {
    return operation?.type === DataPsmCreateClassReference.TYPE;
  }
}

export class DataPsmCreateClassReferenceResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_CLASS_REFERENCE_RESULT;

  readonly createdDataPsmClassReference: string;

  protected constructor(dataPsmClass: string) {
    super();
    this.types.push(DataPsmCreateClassReferenceResult.TYPE);
    this.createdDataPsmClassReference = dataPsmClass;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateClassReferenceResult {
    return result?.types.includes(DataPsmCreateClassReferenceResult.TYPE) ?? false;
  }
}
