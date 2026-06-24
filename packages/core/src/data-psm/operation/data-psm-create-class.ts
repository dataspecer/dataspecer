import { CoreOperationResult, CoreResource, CoreTyped } from "../../core/index.ts";
import { DataPsmCreate } from "./data-psm-create.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateClass extends DataPsmCreate {
  static readonly TYPE = PSM.CREATE_CLASS;

  dataPsmExtends: string[] = [];

  dataPsmIsClosed: boolean | null = null;

  constructor() {
    super();
    this.types.push(DataPsmCreateClass.TYPE);
  }

  static is(resource: CoreResource | null): resource is DataPsmCreateClass {
    return resource?.types.includes(DataPsmCreateClass.TYPE);
  }
}

export class DataPsmCreateClassResult extends CoreOperationResult {
  static readonly TYPE = PSM.CREATE_CLASS_RESULT;

  readonly createdDataPsmClass: string;

  protected constructor(dataPsmClass: string) {
    super();
    this.types.push(DataPsmCreateClassResult.TYPE);
    this.createdDataPsmClass = dataPsmClass;
  }

  static is(resource: CoreTyped | null): resource is DataPsmCreateClassResult {
    return resource?.types.includes(DataPsmCreateClassResult.TYPE);
  }
}
