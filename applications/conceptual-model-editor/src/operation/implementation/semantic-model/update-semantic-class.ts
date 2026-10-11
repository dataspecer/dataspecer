import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";

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
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  executeCreateSemanticOperation,
  findSemanticModel,
} from "../operation-utilities";

export function updateSemanticClassOperation(
  args: Omit<UpdateSemanticClassArguments, "type">,
): UpdateSemanticClassArguments {
  return {
    type: UpdateSemanticClassType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  UpdateSemanticClassType,
  { execute: updateSemanticClassExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateSemanticClassExecutor(
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
