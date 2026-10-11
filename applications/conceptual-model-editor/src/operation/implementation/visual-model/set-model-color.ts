import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findWritableVisualModel } from "./visual-model-utilities";

export function setModelColorOperation(
  args: Omit<SetModelColorArguments, "type">,
): CmeOperation<SetModelColorArguments, SetModelColorResult> {
  return {
    type: SetModelColorType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  SetModelColorType,
  setModelColorOperation,
  { execute: setModelColorExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function setModelColorExecutor(
  context: CmeExecutionContext,
  args: SetModelColorArguments,
): Promise<SetModelColorResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  visualModel.setModelColor(args.model, args.color);
  return { args };
}
