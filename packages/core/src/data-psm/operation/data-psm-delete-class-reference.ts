import { CoreResource, CoreOperation } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmDeleteClassReference extends CoreOperation {
  static readonly TYPE = PSM.DELETE_CLASS_REFERENCE;

  dataPsmClassReference: string | null = null;

  constructor() {
    super();
    this.types.push(DataPsmDeleteClassReference.TYPE);
  }

  static is(
    resource: CoreResource | null
  ): resource is DataPsmDeleteClassReference {
    return resource?.types.includes(DataPsmDeleteClassReference.TYPE);
  }
}
