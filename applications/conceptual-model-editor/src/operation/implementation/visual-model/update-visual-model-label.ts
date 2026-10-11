import {
  LanguageString,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findWritableVisualModel } from "./visual-model-utilities";

export function updateVisualModelLabelOperation(
  args: Omit<UpdateVisualModelLabelArguments, "type">,
): CmeOperation<UpdateVisualModelLabelArguments, UpdateVisualModelLabelResult> {
  return {
    type: UpdateVisualModelLabelType,
    ...args,
  };
}

const UpdateVisualModelLabelType =
  "update-visual-model-label-operation";

interface UpdateVisualModelLabelArguments extends CmeOperationArguments {

  type: typeof UpdateVisualModelLabelType;

  visualModel: ModelDsIdentifier;

  label: LanguageString | null;

}

type UpdateVisualModelLabelResult =
  CmeOperationResult<UpdateVisualModelLabelArguments>;

cmeOperationExecutorRegistry.register(
  UpdateVisualModelLabelType,
  updateVisualModelLabelOperation,
  { execute: updateVisualModelLabelExecutor });

/**
 * Also used to rename a visual model represented by a visual diagram node.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function updateVisualModelLabelExecutor(
  context: CmeExecutionContext,
  args: UpdateVisualModelLabelArguments,
): Promise<UpdateVisualModelLabelResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  visualModel.setLabel(args.label);
  return { args };
}
