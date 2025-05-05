import { CoreResource, CoreOperation } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteContainer extends CoreOperation {
  static readonly TYPE = PSM.DELETE_CONTAINER;

  dataPsmOwner: string | null = null;

  dataPsmContainer: string | null = null;

  constructor() {
    super();
    this.types.push(DataPsmDeleteContainer.TYPE);
  }

  static is(resource: CoreResource | null): resource is DataPsmDeleteContainer {
    return resource?.types.includes(DataPsmDeleteContainer.TYPE);
  }
}
