import { generateOperationId, type Operation } from "../../operation/index.ts";
import { SET_JSON_ENFORCE_CONTEXT } from "../data-psm-vocabulary.ts";

export class DataPsmSetJsonEnforceContext implements Operation {
  static readonly TYPE = SET_JSON_ENFORCE_CONTEXT;

  id: string;

  type: string;

  entityId: string | null = null;
  jsonEnforceContext?: "no" | "as-is" | "with-extensions";

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetJsonEnforceContext.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetJsonEnforceContext {
    return operation?.type === DataPsmSetJsonEnforceContext.TYPE;
  }
}
