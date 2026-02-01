import { CoreResource, CoreOperation } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetProfiling extends CoreOperation {
  static readonly TYPE = PSM.SET_PROFILING;

  dataPsmResource: string | null = null;

  dataPsmProfiling: string[] | null = null;

  constructor() {
    super();
    this.types.push(DataPsmSetProfiling.TYPE);
  }

  static is(resource: CoreResource | null): resource is DataPsmSetProfiling {
    return resource?.types.includes(DataPsmSetProfiling.TYPE);
  }
}
