import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetJsonSchemaPrefixesInIriRegex implements Operation {
  static readonly TYPE = PSM.SET_JSON_SCHEMA_PREFIXES_IN_IRI_REGEX;

  id: string;

  type: string;

  entityId: string | null = null;

  jsonSchemaPrefixesInIriRegex: {
    usePrefixes: "ALWAYS" | "NEVER" | "OPTIONAL";
    includeParentPrefixes: boolean;
  } | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetJsonSchemaPrefixesInIriRegex.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetJsonSchemaPrefixesInIriRegex {
    return operation?.type === DataPsmSetJsonSchemaPrefixesInIriRegex.TYPE;
  }
}
