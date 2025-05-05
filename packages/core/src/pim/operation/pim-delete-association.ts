import { CoreOperation, CoreResource } from "../../core/index.ts";
import * as PIM from "../pim-vocabulary.ts";

export class PimDeleteAssociation extends CoreOperation {
  static readonly TYPE = PIM.DELETE_ASSOCIATION;

  pimAssociation: string | null = null;

  constructor() {
    super();
    this.types.push(PimDeleteAssociation.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimDeleteAssociation {
    return resource?.types.includes(PimDeleteAssociation.TYPE);
  }
}
