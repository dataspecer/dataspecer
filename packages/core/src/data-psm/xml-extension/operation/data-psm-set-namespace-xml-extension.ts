import {CoreOperation, CoreResource} from "../../../core/index.ts";
import {SET_NAMESPACE} from "../vocabulary.ts";

export class DataPsmSetNamespaceXmlExtension extends CoreOperation {
  static readonly TYPE = SET_NAMESPACE;

  dataPsmSchema: string | null = null;

  namespace: string | null = null;
  namespacePrefix: string | null = null;

  constructor() {
    super();
    this.types.push(DataPsmSetNamespaceXmlExtension.TYPE);
  }

  static is(
    resource: CoreResource | null
  ): resource is DataPsmSetNamespaceXmlExtension {
    return resource?.types.includes(DataPsmSetNamespaceXmlExtension.TYPE);
  }
}
