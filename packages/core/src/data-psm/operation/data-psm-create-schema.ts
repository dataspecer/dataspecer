import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateSchema implements Operation {
  static readonly TYPE = PSM.CREATE_SCHEMA;

  id: string;

  type: string;

  /**
   * IRI of the newly created object.
   */
  dataPsmNewIri: string | null = null;

  dataPsmHumanLabel: LanguageString | null = null;

  dataPsmHumanDescription: LanguageString | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateSchema.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateSchema {
    return operation?.type === DataPsmCreateSchema.TYPE;
  }
}

export class DataPsmCreateSchemaResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_SCHEMA_RESULT;

  readonly createdDataPsmSchema: string;

  constructor(dataPsmSchema: string) {
    super();
    this.types.push(DataPsmCreateSchemaResult.TYPE);
    this.createdDataPsmSchema = dataPsmSchema;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateSchemaResult {
    return result?.types.includes(DataPsmCreateSchemaResult.TYPE) ?? false;
  }
}
