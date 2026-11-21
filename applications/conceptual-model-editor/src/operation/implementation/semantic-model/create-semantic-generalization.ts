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
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

const CreateSemanticGeneralizationType =
  "create-semantic-generalization-operation";

interface CreateSemanticGeneralizationArguments extends CmeOperationArguments {

  type: typeof CreateSemanticGeneralizationType;

  /**
   * Identifier of the created entity.
   */
  identifier: EntityDsIdentifier;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  child: EntityDsIdentifier;

  parent: EntityDsIdentifier;

}

interface CreateSemanticGeneralizationResult
  extends CmeOperationResult<CreateSemanticGeneralizationArguments> {

  created: EntityDsIdentifier;

}

export const createSemanticGeneralizationOperation: CmeOperation<
  CreateSemanticGeneralizationArguments, CreateSemanticGeneralizationResult,
  Omit<CreateSemanticGeneralizationArguments, "type" | "identifier">> = {
  metadata: {
    type: CreateSemanticGeneralizationType,
  },
  create: (context, parameters) => ({
    type: CreateSemanticGeneralizationType,
    ...parameters,
    identifier: context.createEntityIdentifier(parameters.semanticModel),
  }),
  execute: createSemanticGeneralizationExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function createSemanticGeneralizationExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticGeneralizationArguments,
): Promise<CreateSemanticGeneralizationResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = createGeneralization({
    id: args.identifier,
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
