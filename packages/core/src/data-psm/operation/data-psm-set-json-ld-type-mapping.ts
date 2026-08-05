import { generateOperationId, type Operation } from "../../operation/index.ts";
import { SET_JSON_LD_TYPE_MAPPING } from "../data-psm-vocabulary.ts";

export class DataPsmSetJsonLdDefinedTypeMapping implements Operation {
  static readonly TYPE = SET_JSON_LD_TYPE_MAPPING;

  id: string;

  type: string;

  entityId: string | null = null;
  jsonLdDefinedTypeMapping: { [prefix: string]: string } | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetJsonLdDefinedTypeMapping.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetJsonLdDefinedTypeMapping {
    return operation?.type === DataPsmSetJsonLdDefinedTypeMapping.TYPE;
  }
}
