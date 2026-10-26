import { Entity } from "@dataspecer/core-v2";
import {
  isVisualDiagramNode,
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  VisualRelationship,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import {
  AnchorOverrideSetting,
  getDefaultUserGivenAlgorithmConfigurationsFull,
  performLayoutOfVisualModel,
  XY,
} from "@dataspecer/layout";

import { createLogger } from "../../../application";
import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { getSemanticConnectionEndConcepts } from "../../../util/relationship-utils";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
  MissingModel,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  createNodeDimensionQueryHandler,
  findWritableVisualModel,
  getAllEntities,
  getBotRightPosition,
  getClassesAndDiagramNodesFromVisualModelRecursively,
  getEntityModelsForLayout,
  getTopLeftPosition,
  getVisualEntity,
  getWritableVisualModels,
  isVisualEdgeEnd,
  NodeDimensions,
} from "./visual-model-utilities";
import { isSemanticConnection } from "./visual-model-additions";
import { applyLayout } from "./layout-visual-model";
import {
  collectDirectVisualEntitiesToRemove,
  removeVisualEntities,
} from "./visual-model-removal";

const LOG = createLogger(import.meta.url);

export function dissolveVisualDiagramNodeOperation(
  args: Omit<DissolveVisualDiagramNodeArguments, "type">,
): CmeOperation<DissolveVisualDiagramNodeArguments, DissolveVisualDiagramNodeResult> {
  return {
    type: DissolveVisualDiagramNodeType,
    ...args,
  };
}

const DissolveVisualDiagramNodeType =
  "dissolve-visual-diagram-node-operation";

interface DissolveVisualDiagramNodeArguments extends CmeOperationArguments {

  type: typeof DissolveVisualDiagramNodeType;

  visualModel: ModelDsIdentifier;

  visualDiagramNode: string;

  /**
   * Dimensions of nodes rendered in the diagram,
   * used to center the content and for overlap removal.
   */
  nodeDimensions?: NodeDimensions;

}

type DissolveVisualDiagramNodeResult =
  CmeOperationResult<DissolveVisualDiagramNodeArguments>;

cmeOperationExecutorRegistry.register(
  DissolveVisualDiagramNodeType,
  dissolveVisualDiagramNodeOperation,
  { execute: dissolveVisualDiagramNodeExecutor });

/**
 * The content is centered at the position of the visual diagram node,
 * edges ending in the visual diagram node are rerouted to the content.
 * Visual profile relationships are not rerouted,
 * they are handled by the visual model validation.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function dissolveVisualDiagramNodeExecutor(
  context: CmeExecutionContext,
  args: DissolveVisualDiagramNodeArguments,
): Promise<DissolveVisualDiagramNodeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const diagramNode = getVisualEntity(visualModel, args.visualDiagramNode);
  if (!isVisualDiagramNode(diagramNode)) {
    throw new InvalidEntity("Expected a visual diagram node.");
  }
  const availableVisualModels = getWritableVisualModels(context);
  const referenced = availableVisualModels.get(diagramNode.representedVisualModel);
  if (referenced === undefined) {
    throw new MissingModel();
  }

  const nodes = [...referenced.getVisualEntities().values()]
    .filter(isVisualEdgeEnd);
  if (nodes.length > 0) {
    // Center the content at the position of the diagram node.
    const topLeft = getTopLeftPosition(nodes);
    const botRight = getBotRightPosition(nodes, args.nodeDimensions);
    const shift: XY = {
      x: (topLeft.x + botRight.x) / 2 - diagramNode.position.x,
      y: (topLeft.y + botRight.y) / 2 - diagramNode.position.y,
    };
    const mapping = copyShifted(referenced, visualModel, shift);
    rerouteEdges(
      getAllEntities(context).map(item => item.entity),
      availableVisualModels, visualModel, referenced,
      diagramNode.id, mapping);
    await removeOverlaps(
      context, visualModel,
      nodes.map(node => mapping[node.id]).filter(item => item !== undefined),
      args.nodeDimensions);
  }

  // Remove the diagram node with remaining edges.
  removeVisualEntities(visualModel, collectDirectVisualEntitiesToRemove(
    visualModel, [diagramNode.id], identifier => {
      const entity = visualModel.getVisualEntity(identifier);
      return entity === null ? [] : [entity];
    }));

  return { args };
}

/**
 * Copy all content, shifting positions.
 *
 * @returns Mapping from source to target identifiers.
 */
function copyShifted(
  source: VisualModel,
  target: WritableVisualModel,
  shift: XY,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const entities = [...source.getVisualEntities().values()];
  const shiftPosition = <T extends XY>(position: T): T => ({
    ...position,
    x: position.x - shift.x,
    y: position.y - shift.y,
  });
  // Nodes first, so edges have their ends.
  for (const entity of entities) {
    if (isVisualNode(entity)) {
      mapping[entity.id] = target.addVisualNode({
        model: entity.model,
        representedEntity: entity.representedEntity,
        position: shiftPosition(entity.position),
        content: [...entity.content],
        visualModels: [...entity.visualModels],
        color: entity.color ?? null,
      });
    } else if (isVisualDiagramNode(entity)) {
      mapping[entity.id] = target.addVisualDiagramNode({
        position: shiftPosition(entity.position),
        representedVisualModel: entity.representedVisualModel,
      });
    }
  }
  for (const entity of entities) {
    if (isVisualRelationship(entity) || isVisualProfileRelationship(entity)) {
      const visualSource = mapping[entity.visualSource];
      const visualTarget = mapping[entity.visualTarget];
      if (visualSource === undefined || visualTarget === undefined) {
        continue;
      }
      const waypoints = entity.waypoints.map(shiftPosition);
      if (isVisualRelationship(entity)) {
        mapping[entity.id] = target.addVisualRelationship({
          model: entity.model,
          representedRelationship: entity.representedRelationship,
          color: entity.color ?? null,
          waypoints,
          visualSource,
          visualTarget,
        });
      } else {
        mapping[entity.id] = target.addVisualProfileRelationship({
          model: entity.model,
          entity: entity.entity,
          color: entity.color ?? null,
          waypoints,
          visualSource,
          visualTarget,
        });
      }
    }
  }
  // Groups last, as they reference other entities.
  for (const entity of entities) {
    if (isVisualGroup(entity)) {
      mapping[entity.id] = target.addVisualGroup({
        anchored: entity.anchored,
        content: entity.content
          .map(item => mapping[item])
          .filter(item => item !== undefined),
      });
    }
  }
  return mapping;
}

/**
 * Reroute edges ending in the diagram node to the copied content.
 * When there are multiple candidates, edges for the same relationship
 * are distributed among them.
 */
function rerouteEdges(
  entities: Entity[],
  availableVisualModels: Map<string, VisualModel>,
  visualModel: WritableVisualModel,
  referenced: VisualModel,
  diagramNode: string,
  mapping: Record<string, string>,
): void {
  const visitCount: Record<string, number> = {};
  for (const visualEntity of [...visualModel.getVisualEntities().values()]) {
    if (!isVisualRelationship(visualEntity)) {
      continue;
    }
    const isSource = visualEntity.visualSource === diagramNode;
    const isTarget = visualEntity.visualTarget === diagramNode;
    if (!isSource && !isTarget) {
      continue;
    }
    const nextEnd = findRerouteTarget(
      entities, availableVisualModels, referenced, visualEntity,
      visitCount, isSource);
    const mapped = nextEnd === null ? undefined : mapping[nextEnd];
    if (mapped === undefined) {
      visualModel.deleteVisualEntity(visualEntity.id);
      continue;
    }
    visualModel.updateVisualEntity(visualEntity.id,
      isSource ? { visualSource: mapped } : { visualTarget: mapped });
  }
}

/**
 * @returns Identifier of the visual entity in the referenced model
 *  the edge should be connected to, or null.
 */
function findRerouteTarget(
  entities: Entity[],
  availableVisualModels: Map<string, VisualModel>,
  referenced: VisualModel,
  visualRelationship: VisualRelationship,
  visitCount: Record<string, number>,
  isDiagramNodeSource: boolean,
): string | null {
  const represented = entities.find(
    item => item.id === visualRelationship.representedRelationship);
  if (represented === undefined || !isSemanticConnection(represented)) {
    LOG.error("Missing represented entity when rerouting.", { visualRelationship });
    return null;
  }
  const { source, target } = getSemanticConnectionEndConcepts(represented);
  const semanticEnd = isDiagramNodeSource ? source : target;
  if (semanticEnd === null) {
    return null;
  }
  // Direct representation in the referenced model.
  const candidates = referenced.getVisualEntitiesForRepresented(semanticEnd);
  if (candidates.length > 0) {
    const key = visualRelationship.representedRelationship;
    const count = visitCount[key] ?? 0;
    visitCount[key] = count + 1;
    return candidates[count % candidates.length].id;
  }
  // Representation inside a nested diagram node.
  for (const visualEntity of referenced.getVisualEntities().values()) {
    if (!isVisualDiagramNode(visualEntity)) {
      continue;
    }
    const contained = getClassesAndDiagramNodesFromVisualModelRecursively(
      availableVisualModels, visualEntity.representedVisualModel);
    if (contained.includes(semanticEnd)) {
      return visualEntity.id;
    }
  }
  return null;
}

/**
 * Move nodes around the inserted content so they do not overlap.
 * The inserted content is kept together by a temporary anchored group.
 */
async function removeOverlaps(
  context: CmeExecutionContext,
  visualModel: WritableVisualModel,
  insertedNodes: string[],
  nodeDimensions: NodeDimensions | undefined,
): Promise<void> {
  if (insertedNodes.length === 0) {
    return;
  }
  const helperGroup = visualModel.addVisualGroup({
    anchored: true,
    content: insertedNodes,
  });
  try {
    const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
    configuration.chosenMainAlgorithm = "elk_overlapRemoval";
    configuration.main.elk_overlapRemoval.min_distance_between_nodes = 0;
    const layout = await performLayoutOfVisualModel(
      { visualModel, outsiders: {} },
      getEntityModelsForLayout(context),
      configuration,
      createNodeDimensionQueryHandler(nodeDimensions),
      {
        notAnchored: [],
        anchored: [],
        shouldAnchorEverythingExceptNotAnchored:
          AnchorOverrideSetting.AnchorEverythingExceptNotAnchored,
      });
    applyLayout(visualModel, layout);
  } catch (error) {
    LOG.warn("Overlap removal failed.", { error });
  } finally {
    visualModel.deleteVisualEntity(helperGroup);
  }
}
