import {
  isVisualProfileRelationship,
  isVisualRelationship,
} from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidOperationArguments,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getVisualEntity,
} from "./visual-model-utilities";
import {
  collectDirectVisualEntitiesToRemove,
  removeVisualEntities,
} from "./visual-model-removal";
import { copyVisualEntities } from "./copy-visual-entities";

export function collapseIntoVisualDiagramNodeOperation(
  args: Omit<CollapseIntoVisualDiagramNodeArguments, "type">,
): CollapseIntoVisualDiagramNodeArguments {
  return {
    type: CollapseIntoVisualDiagramNodeType,
    ...args,
  };
}

const CollapseIntoVisualDiagramNodeType =
  "collapse-into-visual-diagram-node-operation";

interface CollapseIntoVisualDiagramNodeArguments extends CmeOperationArguments {

  type: typeof CollapseIntoVisualDiagramNodeType;

  visualModel: ModelDsIdentifier;

  /**
   * Existing visual model, usually empty, the nodes are moved to.
   */
  representedVisualModel: ModelDsIdentifier;

  /**
   * Visual nodes and visual diagram nodes to move.
   */
  visualNodes: string[];

  /**
   * Visual edges to move, only edges between moved nodes are moved.
   */
  visualEdges: string[];

  /**
   * Position of the new visual diagram node.
   */
  x: number;

  y: number;

}

interface CollapseIntoVisualDiagramNodeResult
  extends CmeOperationResult<CollapseIntoVisualDiagramNodeArguments> {

  created: string;

}

cmeOperationExecutorRegistry.register(
  CollapseIntoVisualDiagramNodeType,
  { execute: collapseIntoVisualDiagramNodeExecutor });

/**
 * Edges between a moved node and a node which stays are rerouted
 * to the new visual diagram node.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function collapseIntoVisualDiagramNodeExecutor(
  context: CmeExecutionContext,
  args: CollapseIntoVisualDiagramNodeArguments,
): Promise<CollapseIntoVisualDiagramNodeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const target = findWritableVisualModel(context, args.representedVisualModel);
  if (visualModel === target) {
    throw new InvalidOperationArguments();
  }
  // Validate all nodes exist before we change anything.
  args.visualNodes.forEach(item => getVisualEntity(visualModel, item));

  copyVisualEntities(visualModel, target, args.visualNodes, args.visualEdges);

  const created = visualModel.addVisualDiagramNode({
    position: { x: args.x, y: args.y, anchored: null },
    representedVisualModel: args.representedVisualModel,
  });

  // Reroute edges.
  const inside = new Set(args.visualNodes);
  const edgesToRemove: string[] = [];
  const edgesToUpdate: {
    identifier: string,
    visualSource: string,
    visualTarget: string,
  }[] = [];
  for (const entity of visualModel.getVisualEntities().values()) {
    if (!isVisualRelationship(entity) && !isVisualProfileRelationship(entity)) {
      continue;
    }
    const isSourceInside = inside.has(entity.visualSource);
    const isTargetInside = inside.has(entity.visualTarget);
    if (isSourceInside && isTargetInside) {
      edgesToRemove.push(entity.id);
    } else if (isSourceInside) {
      edgesToUpdate.push({
        identifier: entity.id,
        visualSource: created,
        visualTarget: entity.visualTarget,
      });
    } else if (isTargetInside) {
      edgesToUpdate.push({
        identifier: entity.id,
        visualSource: entity.visualSource,
        visualTarget: created,
      });
    }
  }
  removeVisualEntities(visualModel, collectDirectVisualEntitiesToRemove(
    visualModel, edgesToRemove, identifier => {
      const entity = visualModel.getVisualEntity(identifier);
      return entity === null ? [] : [entity];
    }));
  for (const { identifier, visualSource, visualTarget } of edgesToUpdate) {
    visualModel.updateVisualEntity(identifier, { visualSource, visualTarget });
  }

  // Remove the moved nodes.
  for (const node of args.visualNodes) {
    if (visualModel.getVisualEntity(node) !== null) {
      visualModel.deleteVisualEntity(node);
    }
  }

  return { args, created };
}
