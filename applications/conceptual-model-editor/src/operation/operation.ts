import { ModelDsIdentifier } from "@/dataspecer/entity-model";

export interface CmeOperation {

  type: string;

}

export interface CmeOperationResult<OperationType extends CmeOperation> {

  operation: OperationType;

}

export class CommandFailed extends Error { }

/**
 * There is no operation for given operation.
 */
export class UnknownOperation extends CommandFailed { }

export class MissingModel extends CommandFailed {

  constructor(models: any, identifier: ModelDsIdentifier) {
    super();
    console.error("Missing model.", {models, identifier});
  }

 }

/**
 * Model exists but is not of an expected type.
 */
export class InvalidModel extends CommandFailed { }
