import { placeCoordinateOnGrid } from "@dataspecer/layout";

import { configuration } from "../../../application";
import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getBotRightPosition,
  getBoundingBoxInfo,
  getNodeHeight,
  getNodeWidth,
  getTopLeftPosition,
  isVisualEdgeEnd,
  NodeDimensions,
} from "./visual-model-utilities";

export function alignVisualNodesOperation(
  args: Omit<AlignVisualNodesArguments, "type">,
): AlignVisualNodesArguments {
  return {
    type: AlignVisualNodesType,
    ...args,
  };
}

const AlignVisualNodesType =
  "align-visual-nodes-operation";

interface AlignVisualNodesArguments extends CmeOperationArguments {

  type: typeof AlignVisualNodesType;

  visualModel: ModelDsIdentifier;

  visualNodes: string[];

  /**
   * Horizontal alignment changes the x coordinate,
   * vertical alignment changes the y coordinate.
   */
  direction: "horizontal" | "vertical";

  /**
   * Start is left or top, end is right or bottom.
   */
  alignment: "start" | "middle" | "end";

  /**
   * Required for middle and end alignment.
   */
  nodeDimensions?: NodeDimensions;

}

type AlignVisualNodesResult =
  CmeOperationResult<AlignVisualNodesArguments>;

cmeOperationExecutorRegistry.register(
  AlignVisualNodesType,
  { execute: alignVisualNodesExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function alignVisualNodesExecutor(
  context: CmeExecutionContext,
  args: AlignVisualNodesArguments,
): Promise<AlignVisualNodesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const nodes = [...visualModel.getVisualEntities().values()]
    .filter(entity => args.visualNodes.includes(entity.id))
    .filter(isVisualEdgeEnd);
  if (nodes.length === 0) {
    return { args };
  }

  const coordinate = args.direction === "horizontal" ? "x" : "y";
  const grid = coordinate === "x" ?
    configuration().xSnapGrid : configuration().ySnapGrid;
  const size = (identifier: string) => coordinate === "x" ?
    getNodeWidth(args.nodeDimensions, identifier) :
    getNodeHeight(args.nodeDimensions, identifier);

  let computeValue: (identifier: string) => number;
  switch (args.alignment) {
  case "start": {
    const topLeft = getTopLeftPosition(nodes);
    computeValue = () => topLeft[coordinate];
    break;
  }
  case "middle": {
    const { mid } = getBoundingBoxInfo(nodes, args.nodeDimensions);
    computeValue = (identifier) =>
      placeCoordinateOnGrid(mid[coordinate] - size(identifier) / 2, grid);
    break;
  }
  case "end": {
    const botRight = getBotRightPosition(nodes, args.nodeDimensions);
    computeValue = (identifier) =>
      placeCoordinateOnGrid(botRight[coordinate] - size(identifier), grid);
    break;
  }
  }

  for (const node of nodes) {
    visualModel.updateVisualEntity(node.id, {
      position: {
        ...node.position,
        [coordinate]: computeValue(node.id),
      },
    });
  }
  return { args };
}
