import { CoreOperation, CoreResource } from "../../core/index.ts";
import * as PIM from "../pim-vocabulary.ts";

export class PimSetDatatype extends CoreOperation {
  static readonly TYPE = PIM.SET_DATATYPE;

  pimAttribute: string | null = null;

  pimDatatype: string | null = null;

  pimLanguageStringRequiredLanguages: string[] | null = null;

  constructor() {
    super();
    this.types.push(PimSetDatatype.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimSetDatatype {
    return resource?.types.includes(PimSetDatatype.TYPE);
  }
}
