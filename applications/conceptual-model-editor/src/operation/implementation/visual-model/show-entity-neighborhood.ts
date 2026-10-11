import { Entity } from "@dataspecer/core-v2";
import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { XY } from "@dataspecer/layout";
import {
  isSemanticModelAttribute,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import { isSemanticModelAttributeProfile } from "../../../dataspecer/semantic-model";
import { getDomainAndRangeConcepts } from "../../../util/relationship-utils";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  EntityWithModel,
  findEntity,
  findWritableVisualModel,
  getAllEntities,
  getAttributesForDomain,
  getEntity,
  NodeDimensions,
} from "./visual-model-utilities";
import {
  addVisualConnection,
  addVisualNodeForEntity,
  addVisualProfileRelationships,
  findPositionsForNewNodes,
  findSemanticNeighborhood,
  isClassOrClassProfile,
  isSemanticConnection,
} from "./visual-model-additions";

export function showEntityNeighborhoodOperation(
  args: Omit<ShowEntityNeighborhoodArguments, "type">,
): CmeOperation<ShowEntityNeighborhoodArguments, ShowEntityNeighborhoodResult> {
  return {
    type: ShowEntityNeighborhoodType,
    ...args,
  };
}

const ShowEntityNeighborhoodType =
  "show-entity-neighborhood-operation";

interface ShowEntityNeighborhoodArguments extends CmeOperationArguments {

  type: typeof ShowEntityNeighborhoodType;

  visualModel: ModelDsIdentifier;

  /**
   * Class, class profile, relationship, relationship profile or attribute.
   */
  entity: EntityDsIdentifier;

  /**
   * Used for a node with no visible neighbors, usually the viewport center.
   */
  fallbackPosition: XY;

  nodeDimensions?: NodeDimensions;

}

type ShowEntityNeighborhoodResult =
  CmeOperationResult<ShowEntityNeighborhoodArguments>;

cmeOperationExecutorRegistry.register(
  ShowEntityNeighborhoodType,
  showEntityNeighborhoodOperation,
  { execute: showEntityNeighborhoodExecutor });

/**
 * For classes the neighborhood are directly connected classes.
 * For relationships it is both ends and the relationship.
 * For attributes it is the domain class.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function showEntityNeighborhoodExecutor(
  context: CmeExecutionContext,
  args: ShowEntityNeighborhoodArguments,
): Promise<ShowEntityNeighborhoodResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const { entity } = getEntity(context, args.entity);

  if (isClassOrClassProfile(entity)) {
    await showClassNeighborhood(context, visualModel, args);
  } else if (isSemanticModelAttribute(entity)
    || isSemanticModelAttributeProfile(entity)) {
    await showAttributeNeighborhood(context, visualModel, args, entity);
  } else if (isSemanticModelRelationship(entity)
    || isSemanticModelRelationshipProfile(entity)) {
    await showRelationshipNeighborhood(context, visualModel, args, entity);
  } else {
    throw new InvalidEntity("Entity type is not supported.");
  }
  return { args };
}

async function showClassNeighborhood(
  context: CmeExecutionContext,
  visualModel: WritableVisualModel,
  args: ShowEntityNeighborhoodArguments,
): Promise<void> {
  const entities = getAllEntities(context).map(item => item.entity);
  const neighborhood = findSemanticNeighborhood(entities, args.entity);
  const nodes = [args.entity, ...neighborhood.nodes];

  const positions = await findPositionsForNewNodes(
    context, visualModel, nodes, args.fallbackPosition, args.nodeDimensions);

  for (const node of nodes) {
    // Only the entity, the neighborhood is shown for, gets all attributes.
    const content = node === args.entity ?
      getAttributesForDomain(entities, node) : [];
    addNodeWithProfileEdges(
      context, entities, visualModel, node,
      positions[node] ?? args.fallbackPosition, content);
  }

  for (const edge of neighborhood.edges) {
    const connection = findEntity(context, edge);
    if (connection !== null && isSemanticConnection(connection.entity)) {
      addVisualConnection(visualModel, connection.entity, connection.model);
    }
  }
}

async function showAttributeNeighborhood(
  context: CmeExecutionContext,
  visualModel: WritableVisualModel,
  args: ShowEntityNeighborhoodArguments,
  attribute: Parameters<typeof getDomainAndRangeConcepts>[0],
): Promise<void> {
  const { domain } = getDomainAndRangeConcepts(attribute);
  if (domain === null) {
    throw new InvalidEntity("Attribute has no domain.");
  }
  const entities = getAllEntities(context).map(item => item.entity);
  if (!visualModel.hasVisualEntityForRepresented(domain)) {
    const positions = await findPositionsForNewNodes(
      context, visualModel, [domain], args.fallbackPosition, args.nodeDimensions);
    addNodeWithProfileEdges(
      context, entities, visualModel, domain,
      positions[domain] ?? args.fallbackPosition, [args.entity]);
  }
  // Add attribute to all domain nodes.
  for (const node of visualModel.getVisualEntitiesForRepresented(domain)) {
    if (!isVisualNode(node) || node.content.includes(args.entity)) {
      continue;
    }
    visualModel.updateVisualEntity(node.id, {
      content: [...node.content, args.entity],
    });
  }
}

async function showRelationshipNeighborhood(
  context: CmeExecutionContext,
  visualModel: WritableVisualModel,
  args: ShowEntityNeighborhoodArguments,
  relationship: Parameters<typeof getDomainAndRangeConcepts>[0],
): Promise<void> {
  const { domain, range } = getDomainAndRangeConcepts(relationship);
  if (domain === null || range === null) {
    throw new InvalidEntity("Relationship has a missing end.");
  }
  const entities = getAllEntities(context).map(item => item.entity);
  const positions = await findPositionsForNewNodes(
    context, visualModel, [domain, range],
    args.fallbackPosition, args.nodeDimensions);
  for (const end of [domain, range]) {
    addNodeWithProfileEdges(
      context, entities, visualModel, end,
      positions[end] ?? args.fallbackPosition, []);
  }
  const connection = getEntity(context, args.entity);
  if (isSemanticConnection(connection.entity)) {
    addVisualConnection(visualModel, connection.entity, connection.model);
  }
}

/**
 * Add a node for class or class profile, unless it is already visible,
 * together with profile edges to its profiles and profiled classes.
 */
function addNodeWithProfileEdges(
  context: CmeExecutionContext,
  entities: Entity[],
  visualModel: WritableVisualModel,
  identifier: EntityDsIdentifier,
  position: XY,
  content: string[],
): void {
  if (visualModel.hasVisualEntityForRepresented(identifier)) {
    return;
  }
  const added: EntityWithModel = getEntity(context, identifier);
  if (!isClassOrClassProfile(added.entity)) {
    throw new InvalidEntity("Expected a class or a class profile.");
  }
  addVisualNodeForEntity(
    entities, visualModel, identifier, added.model, position, content);

  for (const candidate of entities) {
    // Profiles of the added entity.
    if (isSemanticModelClassProfile(candidate)
      && candidate.id !== identifier
      && candidate.profiling.includes(identifier)) {
      const model = findEntity(context, candidate.id)?.model;
      if (model !== undefined) {
        addVisualProfileRelationships(
          visualModel, candidate.id, model, identifier);
      }
    }
  }
  // Entities profiled by the added entity.
  if (isSemanticModelClassProfile(added.entity)) {
    for (const profiled of added.entity.profiling) {
      addVisualProfileRelationships(
        visualModel, identifier, added.model, profiled);
    }
  }
}
