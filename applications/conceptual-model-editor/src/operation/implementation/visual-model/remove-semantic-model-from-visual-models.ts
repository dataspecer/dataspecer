import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { getWritableVisualModels } from "./visual-model-utilities";

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

export const removeSemanticModelFromVisualModelsOperation: CmeOperation<
  RemoveSemanticModelFromVisualModelsArguments, RemoveSemanticModelFromVisualModelsResult> = {
  metadata: {
    type: RemoveSemanticModelFromVisualModelsType,
  },
  create: (_context, parameters) => ({
    type: RemoveSemanticModelFromVisualModelsType,
    ...parameters,
  }),
  execute: removeSemanticModelFromVisualModelsExecutor,
};

/**
 * Removes visual entities and color of the model.
 * Removing the model itself from the package is not part of this operation.
 *
 * @throws CmeOperationExecutionFailed
 */
async function removeSemanticModelFromVisualModelsExecutor(
  context: CmeExecutionContext,
  args: RemoveSemanticModelFromVisualModelsArguments,
): Promise<RemoveSemanticModelFromVisualModelsResult> {
  for (const visualModel of getWritableVisualModels(context).values()) {
    visualModel.deleteModelData(args.model);
  }
  return { args };
}
