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
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  CmeExecutionContext,
  register,
} from "../../operation-registry";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

const CreateSemanticClassType =
  "create-semantic-class-operation";

register(
  CreateSemanticClassType,
  createSemanticClassExecutor,
  "Create a semantic class",
  "Create a semantic class in the given model."
);

interface CreateSemanticClassArguments extends CmeOperationArguments {

  type: typeof CreateSemanticClassType;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

}

interface CreateSemanticClassResult
  extends CmeOperationResult<CreateSemanticClassArguments> {

  created: EntityDsIdentifier;

}

export type CreateSemanticClassOperation = [
  CreateSemanticClassArguments, CreateSemanticClassResult];

/**
 * @throws DataspecerError
 */
export async function createSemanticClassExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticClassArguments,
): Promise<CreateSemanticClassResult> {
  const model = findSemanticModel(context, args);

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
