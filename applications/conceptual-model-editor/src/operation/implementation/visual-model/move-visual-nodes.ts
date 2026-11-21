import { XY } from "@dataspecer/layout";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import {
  findWritableVisualModel,
  getVisualEntity,
  isVisualEdgeEnd,
} from "./visual-model-utilities";

const MoveVisualNodesType =
  "move-visual-nodes-operation";

interface MoveVisualNodesArguments extends CmeOperationArguments {

  type: typeof MoveVisualNodesType;

  visualModel: ModelDsIdentifier;

  /**
   * New positions keyed by visual node identifier.
   */
  positions: Record<string, XY>;

}

type MoveVisualNodesResult =
  CmeOperationResult<MoveVisualNodesArguments>;

export const moveVisualNodesOperation: CmeOperation<
  MoveVisualNodesArguments, MoveVisualNodesResult> = {
  metadata: {
    type: MoveVisualNodesType,
  },
  create: (_context, parameters) => ({
    type: MoveVisualNodesType,
    ...parameters,
  }),
  execute: moveVisualNodesExecutor,
};

/**
 * All nodes are validated before any is moved.
 *
 * @throws CmeOperationExecutionFailed
 */
async function moveVisualNodesExecutor(
  context: CmeExecutionContext,
  args: MoveVisualNodesArguments,
): Promise<MoveVisualNodesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const changes = Object.entries(args.positions).map(([identifier, position]) => {
    const node = getVisualEntity(visualModel, identifier);
    if (!isVisualEdgeEnd(node)) {
      throw new InvalidEntity("Expected a node.");
    }
    return { node, position };
  });
  for (const { node, position } of changes) {
    visualModel.updateVisualEntity(node.id, {
      position: {
        x: position.x,
        y: position.y,
        anchored: node.position.anchored,
      },
    });
  }
  return { args };
}
