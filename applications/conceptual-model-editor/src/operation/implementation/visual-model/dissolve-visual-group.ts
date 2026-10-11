import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findTopLevelGroupInVisualModel,
  findWritableVisualModel,
} from "./visual-model-utilities";
import { removeGroup } from "./visual-model-removal";

export function dissolveVisualGroupOperation(
  args: Omit<DissolveVisualGroupArguments, "type">,
): DissolveVisualGroupArguments {
  return {
    type: DissolveVisualGroupType,
    ...args,
  };
}

const DissolveVisualGroupType =
  "dissolve-visual-group-operation";

interface DissolveVisualGroupArguments extends CmeOperationArguments {

  type: typeof DissolveVisualGroupType;

  visualModel: ModelDsIdentifier;

  /**
   * Group, or any entity inside of a group.
   */
  visualEntity: string;

}

interface DissolveVisualGroupResult
  extends CmeOperationResult<DissolveVisualGroupArguments> {

  removed: string;

}

cmeOperationExecutorRegistry.register(
  DissolveVisualGroupType,
  { execute: dissolveVisualGroupExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function dissolveVisualGroupExecutor(
  context: CmeExecutionContext,
  args: DissolveVisualGroupArguments,
): Promise<DissolveVisualGroupResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const group = findTopLevelGroupInVisualModel(args.visualEntity, visualModel);
  if (group === null) {
    throw new InvalidEntity("Not part of a group.");
  }
  removeGroup(visualModel, group);
  return { args, removed: group };
}
