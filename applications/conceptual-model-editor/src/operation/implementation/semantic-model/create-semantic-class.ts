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
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

interface CreateSemanticClassArguments extends CmeOperationArguments {

  type: typeof CreateSemanticClassType;

  /**
   * Identifier of the created entity.
   */
  identifier: EntityDsIdentifier;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

  order: string | null;

}

const CreateSemanticClassType =
  "create-semantic-class-operation";

interface CreateSemanticClassResult
  extends CmeOperationResult<CreateSemanticClassArguments> {

  created: EntityDsIdentifier;

}

/**
 * The returned arguments carry the result type,
 * so the executor returns {@link CreateSemanticClassResult}.
 */
export const createSemanticClassOperation: CmeOperation<
  CreateSemanticClassArguments, CreateSemanticClassResult,
  Omit<CreateSemanticClassArguments, "type" | "identifier">> = {
  metadata: {
    type: CreateSemanticClassType,
  },
  create: (context, parameters) => ({
    type: CreateSemanticClassType,
    ...parameters,
    identifier: context.createEntityIdentifier(parameters.semanticModel),
  }),
  execute: createSemanticClassExecutor,
};

/**
 * @throws DataspecerError
 */
async function createSemanticClassExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticClassArguments,
): Promise<CreateSemanticClassResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = createClass({
    id: args.identifier,
    iri: args.iri,
    name: args.name ?? undefined,
    description: args.description ?? undefined,
    externalDocumentationUrl: args.externalDocumentationUrl ?? null,
    order: args.order ?? undefined,
  });

  const result = await executeCreateSemanticOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
