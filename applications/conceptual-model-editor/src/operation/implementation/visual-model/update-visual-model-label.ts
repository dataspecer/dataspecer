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
import { findWritableVisualModel } from "./visual-model-utilities";

const UpdateVisualModelLabelType =
  "update-visual-model-label-operation";

interface UpdateVisualModelLabelArguments extends CmeOperationArguments {

  type: typeof UpdateVisualModelLabelType;

  visualModel: ModelDsIdentifier;

  label: LanguageString | null;

}

type UpdateVisualModelLabelResult =
  CmeOperationResult<UpdateVisualModelLabelArguments>;

export const updateVisualModelLabelOperation: CmeOperation<
  UpdateVisualModelLabelArguments, UpdateVisualModelLabelResult> = {
  metadata: {
    type: UpdateVisualModelLabelType,
  },
  create: (_context, parameters) => ({
    type: UpdateVisualModelLabelType,
    ...parameters,
  }),
  execute: updateVisualModelLabelExecutor,
};

/**
 * Also used to rename a visual model represented by a visual diagram node.
 *
 * @throws CmeOperationExecutionFailed
 */
async function updateVisualModelLabelExecutor(
  context: CmeExecutionContext,
  args: UpdateVisualModelLabelArguments,
): Promise<UpdateVisualModelLabelResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  visualModel.setLabel(args.label);
  return { args };
}
