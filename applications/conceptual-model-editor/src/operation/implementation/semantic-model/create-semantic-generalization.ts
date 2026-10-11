import {
  CreatedEntityOperationResult,
  createGeneralization,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

export function createSemanticGeneralizationOperation(
  args: Omit<CreateSemanticGeneralizationArguments, "type">,
): CreateSemanticGeneralizationArguments {
  return {
    type: CreateSemanticGeneralizationType,
    ...args,
  };
}

const CreateSemanticGeneralizationType =
  "create-semantic-generalization-operation";

interface CreateSemanticGeneralizationArguments extends CmeOperationArguments {

  type: typeof CreateSemanticGeneralizationType;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  child: EntityDsIdentifier;

  parent: EntityDsIdentifier;

}

interface CreateSemanticGeneralizationResult
  extends CmeOperationResult<CreateSemanticGeneralizationArguments> {

  created: EntityDsIdentifier;

}

cmeOperationExecutorRegistry.register(
  CreateSemanticGeneralizationType,
  { execute: createSemanticGeneralizationExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function createSemanticGeneralizationExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticGeneralizationArguments,
): Promise<CreateSemanticGeneralizationResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = createGeneralization({
    iri: args.iri,
    child: args.child,
    parent: args.parent,
  });

  const result = await executeCreateSemanticOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
