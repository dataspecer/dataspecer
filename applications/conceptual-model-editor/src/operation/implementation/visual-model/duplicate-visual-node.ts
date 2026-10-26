import {
  isVisualDiagramNode,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  Position,
  VisualProfileRelationship,
  VisualRelationship,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import { placeCoordinateOnGrid } from "@dataspecer/layout";

import { configuration } from "../../../application";
import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  createWaypointsForSelfLoop,
} from "../../../dataspecer/visual-model/operation/add-visual-relationships";
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
  getNodeWidth,
  getVisualEntity,
  isVisualEdgeEnd,
  NodeDimensions,
  VisualEdgeEndPoint,
} from "./visual-model-utilities";

export function duplicateVisualNodeOperation(
  args: Omit<DuplicateVisualNodeArguments, "type">,
): CmeOperation<DuplicateVisualNodeArguments, DuplicateVisualNodeResult> {
  return {
    type: DuplicateVisualNodeType,
    ...args,
  };
}

const DuplicateVisualNodeType =
  "duplicate-visual-node-operation";

interface DuplicateVisualNodeArguments extends CmeOperationArguments {

  type: typeof DuplicateVisualNodeType;

  visualModel: ModelDsIdentifier;

  /**
   * Visual node or visual diagram node to duplicate.
   */
  visualNode: string;

  /**
   * The duplicate is placed left of the original by the node's width.
   */
  nodeDimensions?: NodeDimensions;

}

interface DuplicateVisualNodeResult
  extends CmeOperationResult<DuplicateVisualNodeArguments> {

  created: string;

}

cmeOperationExecutorRegistry.register(
  DuplicateVisualNodeType,
  duplicateVisualNodeOperation,
  { execute: duplicateVisualNodeExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function duplicateVisualNodeExecutor(
  context: CmeExecutionContext,
  args: DuplicateVisualNodeArguments,
): Promise<DuplicateVisualNodeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const node = getVisualEntity(visualModel, args.visualNode);
  if (!isVisualEdgeEnd(node)) {
    throw new InvalidEntity("Expected a visual node or a visual diagram node.");
  }

  const position: Position = {
    x: placeCoordinateOnGrid(
      node.position.x - getNodeWidth(args.nodeDimensions, node.id),
      configuration().xSnapGrid),
    y: node.position.y,
    anchored: node.position.anchored,
  };

  let created: string;
  let duplicates: string[];
  if (isVisualNode(node)) {
    created = visualModel.addVisualNode({ ...node, position });
    duplicates = [...visualModel.getVisualEntities().values()]
      .filter(item => isVisualNode(item)
        && item.representedEntity === node.representedEntity
        && item.id !== created)
      .map(item => item.id);
  } else {
    created = visualModel.addVisualDiagramNode({ ...node, position });
    duplicates = [...visualModel.getVisualEntities().values()]
      .filter(item => isVisualDiagramNode(item)
        && item.representedVisualModel === node.representedVisualModel
        && item.id !== created)
      .map(item => item.id);
  }

  const duplicate = getVisualEntity(visualModel, created) as VisualEdgeEndPoint;
  addEdgesForDuplicate(visualModel, duplicate, duplicates);
  return { args, created };
}

/**
 * For each represented edge connected to any of the existing duplicates,
 * add one copy connected to the new duplicate.
 */
function addEdgesForDuplicate(
  visualModel: WritableVisualModel,
  duplicate: VisualEdgeEndPoint,
  existingDuplicates: string[],
): void {
  const processed = new Set<string>();
  for (const visualEntity of [...visualModel.getVisualEntities().values()]) {
    if (isVisualRelationship(visualEntity)) {
      if (processed.has(visualEntity.representedRelationship)) {
        continue;
      }
      processed.add(visualEntity.representedRelationship);
      const copy = createEdgeCopy(visualEntity, duplicate, existingDuplicates);
      if (copy !== null) {
        visualModel.addVisualRelationship(copy as VisualRelationship);
      }
    } else if (isVisualProfileRelationship(visualEntity)) {
      if (processed.has(visualEntity.entity)) {
        continue;
      }
      processed.add(visualEntity.entity);
      const copy = createEdgeCopy(visualEntity, duplicate, existingDuplicates);
      if (copy !== null) {
        visualModel.addVisualProfileRelationship(copy as VisualProfileRelationship);
      }
    }
  }
}

function createEdgeCopy<Type extends VisualRelationship | VisualProfileRelationship>(
  edge: Type,
  duplicate: VisualEdgeEndPoint,
  existingDuplicates: string[],
): Type | null {
  const isSourceDuplicate = existingDuplicates.includes(edge.visualSource);
  if (edge.visualSource === edge.visualTarget) {
    // Only the loop for the duplicate.
    if (!isSourceDuplicate) {
      return null;
    }
    return {
      ...edge,
      waypoints: createWaypointsForSelfLoop(duplicate.position),
      visualSource: duplicate.id,
      visualTarget: duplicate.id,
    };
  }
  if (isSourceDuplicate) {
    return { ...edge, waypoints: [], visualSource: duplicate.id };
  }
  if (existingDuplicates.includes(edge.visualTarget)) {
    return { ...edge, waypoints: [], visualTarget: duplicate.id };
  }
  return null;
}
