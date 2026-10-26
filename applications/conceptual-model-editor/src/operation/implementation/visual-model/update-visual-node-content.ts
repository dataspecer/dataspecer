import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getVisualNode,
} from "./visual-model-utilities";

export function updateVisualNodeContentOperation(
  args: Omit<UpdateVisualNodeContentArguments, "type">,
): CmeOperation<UpdateVisualNodeContentArguments, UpdateVisualNodeContentResult> {
  return {
    type: UpdateVisualNodeContentType,
    ...args,
  };
}

const UpdateVisualNodeContentType =
  "update-visual-node-content-operation";

interface UpdateVisualNodeContentArguments extends CmeOperationArguments {

  type: typeof UpdateVisualNodeContentType;

  visualModel: ModelDsIdentifier;

  visualNode: string;

  /**
   * Attributes and attribute profiles in order.
   */
  content: EntityDsIdentifier[];

}

type UpdateVisualNodeContentResult =
  CmeOperationResult<UpdateVisualNodeContentArguments>;

cmeOperationExecutorRegistry.register(
  UpdateVisualNodeContentType,
  updateVisualNodeContentOperation,
  { execute: updateVisualNodeContentExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateVisualNodeContentExecutor(
  context: CmeExecutionContext,
  args: UpdateVisualNodeContentArguments,
): Promise<UpdateVisualNodeContentResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const node = getVisualNode(visualModel, args.visualNode);
  visualModel.updateVisualEntity(node.id, { content: [...args.content] });
  return { args };
}
