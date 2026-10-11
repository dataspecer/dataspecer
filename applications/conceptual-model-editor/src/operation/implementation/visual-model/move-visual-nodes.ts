import { XY } from "@dataspecer/layout";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getVisualEntity,
  isVisualEdgeEnd,
} from "./visual-model-utilities";

export function moveVisualNodesOperation(
  args: Omit<MoveVisualNodesArguments, "type">,
): CmeOperation<MoveVisualNodesArguments, MoveVisualNodesResult> {
  return {
    type: MoveVisualNodesType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  MoveVisualNodesType,
  moveVisualNodesOperation,
  { execute: moveVisualNodesExecutor });

/**
 * All nodes are validated before any is moved.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function moveVisualNodesExecutor(
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
