import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateExternalRoot implements Operation {
  static readonly TYPE = PSM.CREATE_EXTERNAL_ROOT;

  id: string;

  type: string;

  dataPsmTechnicalLabel: string | null = null;

  dataPsmTypes: string[] = [];

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateExternalRoot.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateExternalRoot {
    return operation?.type === DataPsmCreateExternalRoot.TYPE;
  }
}

export class DataPsmCreateExternalRootResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_EXTERNAL_ROOT_RESULT;

  readonly createdDataPsmExternalRoot: string;

  protected constructor(dataPsmExternalRoot: string) {
    super();
    this.types.push(DataPsmCreateExternalRootResult.TYPE);
    this.createdDataPsmExternalRoot = dataPsmExternalRoot;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateExternalRootResult {
    return result?.types.includes(DataPsmCreateExternalRootResult.TYPE) ?? false;
  }
}
