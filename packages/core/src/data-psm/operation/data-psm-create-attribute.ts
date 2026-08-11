import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import { generateEntityId } from "../../entity-model/entity.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateAttribute implements Operation {
  static readonly TYPE = PSM.CREATE_ATTRIBUTE;

  id: string;

  type: string;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmInterpretation: string | null = null;

  dataPsmTechnicalLabel: string | null = null;

  dataPsmHumanLabel: LanguageString | null = null;

  dataPsmHumanDescription: LanguageString | null = null;

  dataPsmOwner: string | null = null;

  dataPsmDatatype: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateAttribute.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateAttribute {
    return operation?.type === DataPsmCreateAttribute.TYPE;
  }
}

export class DataPsmCreateAttributeResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_ATTRIBUTE_RESULT;

  readonly createdDataPsmAttribute: string;

  constructor(dataPsmAttribute: string) {
    super();
    this.types.push(DataPsmCreateAttributeResult.TYPE);
    this.createdDataPsmAttribute = dataPsmAttribute;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateAttributeResult {
    return result?.types.includes(DataPsmCreateAttributeResult.TYPE) ?? false;
  }
}
