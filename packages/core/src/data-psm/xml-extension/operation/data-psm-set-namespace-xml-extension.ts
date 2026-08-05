import { generateOperationId, type Operation } from "../../../operation/index.ts";
import {SET_NAMESPACE} from "../vocabulary.ts";

export class DataPsmSetNamespaceXmlExtension implements Operation {
  static readonly TYPE = SET_NAMESPACE;

  id: string;

  type: string;

  entityId: string | null = null;

  namespace: string | null = null;
  namespacePrefix: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetNamespaceXmlExtension.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetNamespaceXmlExtension {
    return operation?.type === DataPsmSetNamespaceXmlExtension.TYPE;
  }
}
