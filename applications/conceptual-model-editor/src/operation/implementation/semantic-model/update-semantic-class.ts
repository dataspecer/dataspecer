import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";

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

const UpdateSemanticClassType =
  "update-semantic-class-operation";

interface UpdateSemanticClassArguments extends CmeOperationArguments {

  type: typeof UpdateSemanticClassType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

  order: string | null;

}

type UpdateSemanticClassResult =
  CmeOperationResult<UpdateSemanticClassArguments>;

export const updateSemanticClassOperation: CmeOperation<
  UpdateSemanticClassArguments, UpdateSemanticClassResult> = {
  metadata: {
    type: UpdateSemanticClassType,
  },
  create: (_context, parameters) => ({
    type: UpdateSemanticClassType,
    ...parameters,
  }),
  execute: updateSemanticClassExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateSemanticClassExecutor(
  context: CmeExecutionContext,
  args: UpdateSemanticClassArguments,
): Promise<UpdateSemanticClassResult> {
  const model = findSemanticModel(context, args.semanticModel);

  const operation = modifyClass(args.entity, {
    iri: args.iri,
    name: args.name ?? undefined,
    description: args.description ?? undefined,
    externalDocumentationUrl: args.externalDocumentationUrl ?? null,
    order: args.order,
  });

  await executeCreateSemanticOperation(model, operation);
  return { args };
}
