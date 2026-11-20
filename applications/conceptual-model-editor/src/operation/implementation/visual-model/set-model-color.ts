import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { findWritableVisualModel } from "./visual-model-utilities";

const SetModelColorType =
  "set-model-color-operation";

interface SetModelColorArguments extends CmeOperationArguments {

  type: typeof SetModelColorType;

  visualModel: ModelDsIdentifier;

  /**
   * Semantic or profile model.
   */
  model: ModelDsIdentifier;

  /**
   * Hexadecimal color, for example "#ff0000".
   */
  color: string;

}

type SetModelColorResult =
  CmeOperationResult<SetModelColorArguments>;

export const setModelColorOperation: CmeOperation<SetModelColorArguments, SetModelColorResult> = {
  metadata: {
    type: SetModelColorType,
  },
  create: (_context, parameters) => ({
    type: SetModelColorType,
    ...parameters,
  }),
  execute: setModelColorExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function setModelColorExecutor(
  context: CmeExecutionContext,
  args: SetModelColorArguments,
): Promise<SetModelColorResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  visualModel.setModelColor(args.model, args.color);
  return { args };
}
