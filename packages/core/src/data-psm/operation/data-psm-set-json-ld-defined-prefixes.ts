import { generateOperationId, type Operation } from "../../operation/index.ts";
import { SET_JSON_LD_DEFINED_PREFIXES } from "../data-psm-vocabulary.ts";

export class DataPsmSetJsonLdDefinedPrefixes implements Operation {
  static readonly TYPE = SET_JSON_LD_DEFINED_PREFIXES;

  id: string;

  type: string;

  entityId: string | null = null;
  jsonLdDefinedPrefixes: { [prefix: string]: string } | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetJsonLdDefinedPrefixes.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetJsonLdDefinedPrefixes {
    return operation?.type === DataPsmSetJsonLdDefinedPrefixes.TYPE;
  }
}
