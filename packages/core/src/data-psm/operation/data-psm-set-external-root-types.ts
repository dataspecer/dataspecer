import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetExternalRootTypes implements Operation {
  static readonly TYPE = PSM.SET_EXTERNAL_ROOT_TYPES;

  id: string;

  type: string;

  dataPsmExternalRoot: string | null = null;

  dataPsmTypes: string[] = [];

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetExternalRootTypes.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetExternalRootTypes {
    return operation?.type === DataPsmSetExternalRootTypes.TYPE;
  }
}
