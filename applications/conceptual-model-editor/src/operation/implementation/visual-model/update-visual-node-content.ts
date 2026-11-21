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
import {
  findWritableVisualModel,
  getVisualNode,
} from "./visual-model-utilities";

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

export const updateVisualNodeContentOperation: CmeOperation<
  UpdateVisualNodeContentArguments, UpdateVisualNodeContentResult> = {
  metadata: {
    type: UpdateVisualNodeContentType,
  },
  create: (_context, parameters) => ({
    type: UpdateVisualNodeContentType,
    ...parameters,
  }),
  execute: updateVisualNodeContentExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateVisualNodeContentExecutor(
  context: CmeExecutionContext,
  args: UpdateVisualNodeContentArguments,
): Promise<UpdateVisualNodeContentResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const node = getVisualNode(visualModel, args.visualNode);
  visualModel.updateVisualEntity(node.id, { content: [...args.content] });
  return { args };
}
