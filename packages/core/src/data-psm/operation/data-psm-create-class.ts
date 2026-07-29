import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import { generateEntityId } from "../../entity-model/entity.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateClass implements Operation {
  static readonly TYPE = PSM.CREATE_CLASS;

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

  dataPsmExtends: string[] = [];

  dataPsmIsClosed: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateClass.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateClass {
    return operation?.type === DataPsmCreateClass.TYPE;
  }
}

export class DataPsmCreateClassResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_CLASS_RESULT;

  readonly createdDataPsmClass: string;

  protected constructor(dataPsmClass: string) {
    super();
    this.types.push(DataPsmCreateClassResult.TYPE);
    this.createdDataPsmClass = dataPsmClass;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateClassResult {
    return result?.types.includes(DataPsmCreateClassResult.TYPE) ?? false;
  }
}
