import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { getWritableVisualModels } from "./visual-model-utilities";

export function removeSemanticModelFromVisualModelsOperation(
  args: Omit<RemoveSemanticModelFromVisualModelsArguments, "type">,
): RemoveSemanticModelFromVisualModelsArguments {
  return {
    type: RemoveSemanticModelFromVisualModelsType,
    ...args,
  };
}

const RemoveSemanticModelFromVisualModelsType =
  "remove-semantic-model-from-visual-models-operation";

interface RemoveSemanticModelFromVisualModelsArguments
  extends CmeOperationArguments {

  type: typeof RemoveSemanticModelFromVisualModelsType;

  /**
   * Semantic or profile model.
   */
  model: ModelDsIdentifier;

}

type RemoveSemanticModelFromVisualModelsResult =
  CmeOperationResult<RemoveSemanticModelFromVisualModelsArguments>;

cmeOperationExecutorRegistry.register(
  RemoveSemanticModelFromVisualModelsType,
  { execute: removeSemanticModelFromVisualModelsExecutor });

/**
 * Removes visual entities and color of the model.
 * Removing the model itself from the package is not part of this operation.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function removeSemanticModelFromVisualModelsExecutor(
  context: CmeExecutionContext,
  args: RemoveSemanticModelFromVisualModelsArguments,
): Promise<RemoveSemanticModelFromVisualModelsResult> {
  for (const visualModel of getWritableVisualModels(context).values()) {
    visualModel.deleteModelData(args.model);
  }
  return { args };
}
