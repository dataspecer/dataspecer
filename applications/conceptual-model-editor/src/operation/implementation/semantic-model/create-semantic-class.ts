import {
  createClass,
  CreatedEntityOperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  cmeOperationExecutorRegistry
} from "../../operation-registry";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

export function createSemanticClassOperation(
  args: Omit<CreateSemanticClassArguments, "type">,
): CreateSemanticClassArguments {
  return {
    type: CreateSemanticClassType,
    ...args,
  };
}

interface CreateSemanticClassArguments extends CmeOperationArguments {

  type: typeof CreateSemanticClassType;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

}

const CreateSemanticClassType =
  "create-semantic-class-operation";

interface CreateSemanticClassResult
  extends CmeOperationResult<CreateSemanticClassArguments> {

  created: EntityDsIdentifier;

}

cmeOperationExecutorRegistry.register(
  CreateSemanticClassType,
  { execute: createSemanticClassExecutor },
)

/**
 * @throws DataspecerError
 */
export async function createSemanticClassExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticClassArguments,
): Promise<CreateSemanticClassResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = createClass({
    iri: args.iri,
    name: args.name ?? undefined,
    description: args.description ?? undefined,
    externalDocumentationUrl: args.externalDocumentationUrl ?? null,
  });

  const result = await executeCreateSemanticOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
