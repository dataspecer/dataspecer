import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import {
  findTopLevelGroupInVisualModel,
  findWritableVisualModel,
} from "./visual-model-utilities";
import { removeGroup } from "./visual-model-removal";

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

export const dissolveVisualGroupOperation: CmeOperation<
  DissolveVisualGroupArguments, DissolveVisualGroupResult> = {
  metadata: {
    type: DissolveVisualGroupType,
  },
  create: (_context, parameters) => ({
    type: DissolveVisualGroupType,
    ...parameters,
  }),
  execute: dissolveVisualGroupExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function dissolveVisualGroupExecutor(
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
