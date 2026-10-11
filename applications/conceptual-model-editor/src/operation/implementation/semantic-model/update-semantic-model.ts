import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { isInMemorySemanticModel } from "../../../dataspecer/semantic-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findSemanticModel } from "../operation-utilities";

export function updateSemanticModelOperation(
  args: Omit<UpdateSemanticModelArguments, "type">,
): UpdateSemanticModelArguments {
  return {
    type: UpdateSemanticModelType,
    ...args,
  };
}

const UpdateSemanticModelType =
  "update-semantic-model-operation";

interface UpdateSemanticModelArguments extends CmeOperationArguments {

  type: typeof UpdateSemanticModelType;

  semanticModel: ModelDsIdentifier;

  alias: string | null;

  baseIri: string | null;

}

type UpdateSemanticModelResult =
  CmeOperationResult<UpdateSemanticModelArguments>;

cmeOperationExecutorRegistry.register(
  UpdateSemanticModelType,
  { execute: updateSemanticModelExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateSemanticModelExecutor(
  context: CmeExecutionContext,
  args: UpdateSemanticModelArguments,
): Promise<UpdateSemanticModelResult> {
  const model = findSemanticModel(context, args.semanticModel);
  if (!isInMemorySemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  model.setAlias(args.alias);
  model.setBaseIri(args.baseIri ?? "");
  return { args };
}
