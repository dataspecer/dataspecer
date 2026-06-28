import { CoreOperation, CoreResource } from "../../../core/index.ts";
import { SET_GML_TYPE } from "../vocabulary.ts";

export class DataPsmSetGmlTypeXmlExtension extends CoreOperation {
  static readonly TYPE = SET_GML_TYPE;

  dataPsmProperty: string | null = null;

  gmlType: string | null = null;

  constructor() {
    super();
    this.types.push(DataPsmSetGmlTypeXmlExtension.TYPE);
  }

  static is(
    resource: CoreResource | null
  ): resource is DataPsmSetGmlTypeXmlExtension {
    return resource?.types.includes(DataPsmSetGmlTypeXmlExtension.TYPE);
  }
}