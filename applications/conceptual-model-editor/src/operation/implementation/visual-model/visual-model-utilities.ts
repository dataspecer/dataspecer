import { Entity, EntityModel } from "@dataspecer/core-v2";
import {
  isSemanticModelAttribute,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isVisualDiagramNode,
  isVisualGroup,
  isVisualNode,
  isWritableVisualModel,
  VisualDiagramNode,
  VisualEntity,
  VisualGroup,
  VisualModel,
  VisualNode,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import {
  Node,
  NodeDimensionQueryHandler,
  ReactflowDimensionsEstimator,
  XY,
} from "@dataspecer/layout";

import { EntityDsIdentifier, ModelDsIdentifier } from "../../../dataspecer/entity-model";
import { isSemanticModelAttributeProfile } from "../../../dataspecer/semantic-model";
import { getDomainAndRangeConcepts } from "../../../util/relationship-utils";
import {
  CmeExecutionContext,
  InvalidEntity,
  MissingEntity,
} from "../../operation";
import { findVisualModel } from "../operation-utilities";

/**
 * Dimensions of rendered nodes, keyed by visual identifier.
 * The values are provided by the caller as only the diagram knows them.
 */
export type NodeDimensions = Record<string, { width: number, height: number }>;

/**
 * Visual entity which can be an end of an edge.
 */
export type VisualEdgeEndPoint = VisualDiagramNode | VisualNode;

export function isVisualEdgeEnd(what: VisualEntity): what is VisualEdgeEndPoint {
  return isVisualNode(what) || isVisualDiagramNode(what);
}

/**
 * @throws MissingModel
 * @throws InvalidModel
 */
export function findWritableVisualModel(
  context: CmeExecutionContext,
  identifier: ModelDsIdentifier,
): WritableVisualModel {
  return findVisualModel(context, identifier);
}

/**
 * @returns All writable visual models keyed by identifier.
 */
export function getWritableVisualModels(
  context: CmeExecutionContext,
): Map<string, WritableVisualModel> {
  const result = new Map<string, WritableVisualModel>();
  for (const model of Object.values(context.visualModels)) {
    if (isWritableVisualModel(model)) {
      result.set(model.getIdentifier(), model);
    }
  }
  return result;
}

/**
 * Semantic and profile models are often the same instances,
 * this returns each model only once.
 */
export function getEntityModels(
  context: CmeExecutionContext,
): { getId(): string, getEntities(): Record<string, Entity> }[] {
  // TODO Here we abuse the fact that semantic and profile models are the same.
  return [...Object.values(context.semanticModels)];
}

/**
 * Layout works with legacy entity models.
 */
export function getEntityModelsForLayout(
  context: CmeExecutionContext,
): Map<string, EntityModel> {
  const result = new Map<string, EntityModel>();
  for (const model of getEntityModels(context)) {
    result.set(model.getId(), model as unknown as EntityModel);
  }
  return result;
}

/**
 * Raw entity together with identifier of its model.
 */
export interface EntityWithModel {

  entity: Entity;

  model: ModelDsIdentifier;

}

/**
 * @returns All entities from all models.
 */
export function getAllEntities(context: CmeExecutionContext): EntityWithModel[] {
  const result: EntityWithModel[] = [];
  for (const model of getEntityModels(context)) {
    const identifier = model.getId();
    for (const entity of Object.values(model.getEntities())) {
      result.push({ entity, model: identifier });
    }
  }
  return result;
}

export function findEntity(
  context: CmeExecutionContext,
  identifier: EntityDsIdentifier,
): EntityWithModel | null {
  for (const model of getEntityModels(context)) {
    const entity = model.getEntities()[identifier];
    if (entity !== undefined) {
      return { entity, model: model.getId() };
    }
  }
  return null;
}

/**
 * @throws MissingEntity
 */
export function getEntity(
  context: CmeExecutionContext,
  identifier: EntityDsIdentifier,
): EntityWithModel {
  const result = findEntity(context, identifier);
  if (result === null) {
    throw new MissingEntity();
  }
  return result;
}

/**
 * @throws MissingEntity
 */
export function getVisualEntity(
  visualModel: VisualModel,
  identifier: string,
): VisualEntity {
  const result = visualModel.getVisualEntity(identifier);
  if (result === null) {
    throw new MissingEntity();
  }
  return result;
}

/**
 * @throws MissingEntity
 * @throws InvalidEntity
 */
export function getVisualNode(
  visualModel: VisualModel,
  identifier: string,
): VisualNode {
  const result = getVisualEntity(visualModel, identifier);
  if (!isVisualNode(result)) {
    throw new InvalidEntity();
  }
  return result;
}

/**
 * @returns Identifiers of all attributes and attribute profiles with
 *  given class or class profile as a domain.
 */
export function getAttributesForDomain(
  entities: Entity[],
  domain: EntityDsIdentifier,
): string[] {
  const result: string[] = [];
  for (const entity of entities) {
    if (isSemanticModelAttribute(entity)) {
      if (getDomainAndRangeConcepts(entity).domain === domain) {
        result.push(entity.id);
      }
    }
  }
  for (const entity of entities) {
    if (isSemanticModelAttributeProfile(entity)) {
      if (getDomainAndRangeConcepts(entity).domain === domain) {
        result.push(entity.id);
      }
    }
  }
  return result;
}

//
// Groups
//

/**
 * @returns Mapping of all kind of nodes to group to which they belong.
 */
export function getGroupMappings(visualModel: VisualModel) {
  const existingGroups: Record<string, VisualGroup> = {};
  const nodeToGroupMapping: Record<string, string> = {};
  for (const [identifier, group] of visualModel.getVisualEntities()) {
    if (isVisualGroup(group)) {
      existingGroups[identifier] = group;
      for (const nodeInGroup of group.content) {
        nodeToGroupMapping[nodeInGroup] = identifier;
      }
    }
  }
  return { existingGroups, nodeToGroupMapping };
}

/**
 * @returns The top level group, or null if the node is not part of any group.
 *  If {@link identifier} is a top level group, it is returned.
 */
export function findTopLevelGroup<T>(
  identifier: string,
  existingGroups: Record<string, T>,
  nodeToGroupMapping: Record<string, string>,
): string | null {
  if (nodeToGroupMapping[identifier] === undefined) {
    return existingGroups[identifier] === undefined ? null : identifier;
  }
  let topLevelGroup = nodeToGroupMapping[identifier];
  while (nodeToGroupMapping[topLevelGroup] !== undefined) {
    topLevelGroup = nodeToGroupMapping[topLevelGroup];
  }
  return topLevelGroup;
}

export function findTopLevelGroupInVisualModel(
  identifier: string,
  visualModel: VisualModel,
): string | null {
  const { existingGroups, nodeToGroupMapping } = getGroupMappings(visualModel);
  return findTopLevelGroup(identifier, existingGroups, nodeToGroupMapping);
}

//
// Visual diagram nodes
//

/**
 * @returns Semantic identifiers of nodes in the visual model, following
 *  visual diagram nodes. Visual diagram nodes are represented by identifier
 *  of the visual model they represent.
 */
export function getClassesAndDiagramNodesFromVisualModelRecursively(
  availableVisualModels: Map<string, VisualModel>,
  visualModel: string,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const collect = (identifier: string) => {
    if (visited.has(identifier)) {
      // Protection against cycles.
      return;
    }
    visited.add(identifier);
    const linkedVisualModel = availableVisualModels.get(identifier);
    if (linkedVisualModel === undefined) {
      return;
    }
    for (const visualEntity of linkedVisualModel.getVisualEntities().values()) {
      if (isVisualNode(visualEntity)) {
        result.push(visualEntity.representedEntity);
      } else if (isVisualDiagramNode(visualEntity)) {
        result.push(visualEntity.representedVisualModel);
        collect(visualEntity.representedVisualModel);
      }
    }
  };
  collect(visualModel);
  return result;
}

/**
 * @returns For each class (or represented visual model) all the visual
 *  diagram nodes in {@link visualModel} containing it, possibly multiple times.
 */
export function getClassToVisualDiagramNodeMapping(
  availableVisualModels: Map<string, VisualModel>,
  visualModel: VisualModel,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [identifier, visualEntity] of visualModel.getVisualEntities()) {
    if (!isVisualDiagramNode(visualEntity)) {
      continue;
    }
    const containedNodes = getClassesAndDiagramNodesFromVisualModelRecursively(
      availableVisualModels, visualEntity.representedVisualModel);
    for (const containedNode of containedNodes) {
      (result[containedNode] ??= []).push(identifier);
    }
  }
  return result;
}

/**
 * @returns True when adding a diagram node for {@link addedVisualModel}
 *  into {@link visualModel} would create a cycle.
 */
export function doesAddingVisualModelCauseSelfReference(
  availableVisualModels: Map<string, VisualModel>,
  visualModel: VisualModel,
  addedVisualModel: string,
): boolean {
  if (visualModel.getIdentifier() === addedVisualModel) {
    return true;
  }
  return getClassesAndDiagramNodesFromVisualModelRecursively(
    availableVisualModels, addedVisualModel)
    .includes(visualModel.getIdentifier());
}

/**
 * @returns Visual entities representing {@link identifier} including
 *  visual diagram nodes which contain it.
 */
export function getVisualEntitiesForRepresentedGlobal(
  availableVisualModels: Map<string, VisualModel>,
  visualModel: VisualModel,
): (identifier: string) => VisualEntity[] {
  const mapping = getClassToVisualDiagramNodeMapping(
    availableVisualModels, visualModel);
  return (identifier: string) => {
    const direct = visualModel.getVisualEntitiesForRepresented(identifier);
    const indirect = (mapping[identifier] ?? [])
      .map(item => visualModel.getVisualEntity(item))
      .filter(item => item !== null);
    return direct.concat(indirect);
  };
}

//
// Geometry
//

export function getNodeWidth(
  dimensions: NodeDimensions | undefined,
  identifier: string,
): number {
  return dimensions?.[identifier]?.width ?? 0;
}

export function getNodeHeight(
  dimensions: NodeDimensions | undefined,
  identifier: string,
): number {
  return dimensions?.[identifier]?.height ?? 0;
}

/**
 * @returns Top left position of the bounding box of given nodes.
 */
export function getTopLeftPosition(nodes: VisualEdgeEndPoint[]): XY {
  const topLeft = { x: 10000000, y: 10000000 };
  for (const node of nodes) {
    topLeft.x = Math.min(topLeft.x, node.position.x);
    topLeft.y = Math.min(topLeft.y, node.position.y);
  }
  return topLeft;
}

/**
 * @returns Bottom right position of the bounding box of given nodes,
 *  including node dimensions.
 */
export function getBotRightPosition(
  nodes: VisualEdgeEndPoint[],
  dimensions: NodeDimensions | undefined,
): XY {
  const botRight = { x: -10000000, y: -10000000 };
  for (const node of nodes) {
    botRight.x = Math.max(
      botRight.x, node.position.x + getNodeWidth(dimensions, node.id));
    botRight.y = Math.max(
      botRight.y, node.position.y + getNodeHeight(dimensions, node.id));
  }
  return botRight;
}

export function getBoundingBoxInfo(
  nodes: VisualEdgeEndPoint[],
  dimensions: NodeDimensions | undefined,
) {
  const topLeft = getTopLeftPosition(nodes);
  const botRight = getBotRightPosition(nodes, dimensions);
  const mid = {
    x: (topLeft.x + botRight.x) / 2,
    y: (topLeft.y + botRight.y) / 2,
  };
  return { topLeft, mid, botRight };
}

/**
 * @returns Dimension handler for layout, using given dimensions
 *  and falling back to an estimate.
 */
export function createNodeDimensionQueryHandler(
  dimensions: NodeDimensions | undefined,
): NodeDimensionQueryHandler {
  const estimator = new ReactflowDimensionsEstimator();
  return {
    getWidth: (node: Node) =>
      dimensions?.[node.id]?.width ?? estimator.getWidth(node),
    getHeight: (node: Node) =>
      dimensions?.[node.id]?.height ?? estimator.getHeight(node),
  };
}
