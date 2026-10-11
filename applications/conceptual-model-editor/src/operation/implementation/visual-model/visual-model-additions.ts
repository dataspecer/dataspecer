import { Entity } from "@dataspecer/core-v2";
import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  SemanticModelGeneralization,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  isVisualNode,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import {
  AnchorOverrideSetting,
  ExplicitAnchors,
  getDefaultUserGivenAlgorithmConfigurationsFull,
  performLayoutOfVisualModel,
  XY,
} from "@dataspecer/layout";

import { createLogger } from "../../../application";
import { EntityDsIdentifier, ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds,
} from "../../../dataspecer/visual-model/operation/add-visual-relationships";
import { getSemanticConnectionEndConcepts } from "../../../util/relationship-utils";
import {
  createNodeDimensionQueryHandler,
  EntityWithModel,
  getAllEntities,
  getAttributesForDomain,
  getEntityModelsForLayout,
  NodeDimensions,
} from "./visual-model-utilities";
import {
  CmeExecutionContext,
} from "../../operation";

const LOG = createLogger(import.meta.url);

export type SemanticConnection =
  SemanticModelRelationship
  | SemanticModelRelationshipProfile
  | SemanticModelGeneralization;

export function isSemanticConnection(entity: Entity): entity is SemanticConnection {
  return isSemanticModelRelationship(entity)
    || isSemanticModelRelationshipProfile(entity)
    || isSemanticModelGeneralization(entity);
}

export function isClassOrClassProfile(
  entity: Entity,
): entity is (Entity & { id: string }) {
  return isSemanticModelClass(entity) || isSemanticModelClassProfile(entity);
}

/**
 * Add a visual node for given class or class profile.
 *
 * @param content Node content, when null all attributes with the class
 *  as a domain are used.
 * @returns Identifier of the created visual node.
 */
export function addVisualNodeForEntity(
  entities: Entity[],
  visualModel: WritableVisualModel,
  entity: EntityDsIdentifier,
  model: ModelDsIdentifier,
  position: XY,
  content: string[] | null,
): string {
  return visualModel.addVisualNode({
    model,
    representedEntity: entity,
    position: {
      x: position.x,
      y: position.y,
      anchored: null,
    },
    content: content ?? getAttributesForDomain(entities, entity),
    visualModels: [],
  });
}

/**
 * Add visual relationships for given relationship, relationship profile
 * or generalization between all visual representations of its ends.
 *
 * @returns False when an end is not in the visual model or the entity
 *  has no ends, true otherwise.
 */
export function addVisualConnection(
  visualModel: WritableVisualModel,
  entity: SemanticConnection,
  model: ModelDsIdentifier,
): boolean {
  const { source, target } = getSemanticConnectionEndConcepts(entity);
  if (source === null || target === null) {
    LOG.warn("Ignored connection as ends are null.", { entity });
    return false;
  }
  const visualSources = visualModel.getVisualEntitiesForRepresented(source);
  const visualTargets = visualModel.getVisualEntitiesForRepresented(target);
  if (visualSources.length === 0 || visualTargets.length === 0) {
    return false;
  }
  addVisualRelationshipsWithSpecifiedVisualEnds(
    visualModel, model, entity.id, visualSources, visualTargets);
  return true;
}

/**
 * Add visual profile relationships from all visuals of {@link profile}
 * to all visuals of {@link profiled}.
 *
 * @returns False when one of the ends is not in the visual model.
 */
export function addVisualProfileRelationships(
  visualModel: WritableVisualModel,
  profile: EntityDsIdentifier,
  profileModel: ModelDsIdentifier,
  profiled: EntityDsIdentifier,
): boolean {
  const sources = visualModel.getVisualEntitiesForRepresented(profile);
  const targets = visualModel.getVisualEntitiesForRepresented(profiled);
  if (sources.length === 0 || targets.length === 0) {
    return false;
  }
  for (const source of sources) {
    for (const target of targets) {
      visualModel.addVisualProfileRelationship({
        entity: profile,
        model: profileModel,
        visualSource: source.id,
        visualTarget: target.id,
        waypoints: [],
      });
    }
  }
  return true;
}

/**
 * For given class or class profile make sure, that all connections
 * to other entities in the visual model are visible.
 */
export function addRelatedEntities(
  entities: EntityWithModel[],
  visualModel: WritableVisualModel,
  added: EntityWithModel,
): void {
  const identifier = added.entity.id;
  const addedProfile = isSemanticModelClassProfile(added.entity) ?
    added.entity : null;
  for (const { entity: candidate, model: candidateModel } of entities) {
    if (isSemanticModelGeneralization(candidate)) {
      if (shouldAddGeneralization(visualModel, identifier, candidate)) {
        addVisualConnection(visualModel, candidate, candidateModel);
      }
    }
    if (isSemanticModelRelationship(candidate)
      || isSemanticModelRelationshipProfile(candidate)) {
      if (shouldAddRelationship(visualModel, identifier, candidate)) {
        addVisualConnection(visualModel, candidate, candidateModel);
      }
    }
    if (isSemanticModelClassProfile(candidate)) {
      if (shouldAddProfile(visualModel, identifier, candidate)) {
        // Candidate is a profile of the added entity.
        addVisualProfileRelationships(
          visualModel, candidate.id, candidateModel, identifier);
      } else if (addedProfile !== null
        && shouldAddProfile(visualModel, candidate.id, addedProfile)) {
        // Added entity is a profile of the candidate.
        addVisualProfileRelationships(
          visualModel, identifier, added.model, candidate.id);
      }
    }
    if (addedProfile !== null && isSemanticModelClass(candidate)) {
      if (addedProfile.profiling.includes(candidate.id)) {
        // Added entity is a profile of the candidate.
        addVisualProfileRelationships(
          visualModel, identifier, added.model, candidate.id);
      }
    }
  }
}

function shouldAddGeneralization(
  visualModel: VisualModel,
  identifier: string,
  candidate: SemanticModelGeneralization,
): boolean {
  if (candidate.parent === identifier) {
    return visualModel.hasVisualEntityForRepresented(candidate.child);
  } else if (candidate.child === identifier) {
    return visualModel.hasVisualEntityForRepresented(candidate.parent);
  }
  return false;
}

function shouldAddRelationship(
  visualModel: VisualModel,
  identifier: string,
  candidate: SemanticModelRelationship | SemanticModelRelationshipProfile,
): boolean {
  const { source, target } = getSemanticConnectionEndConcepts(candidate);
  if (source === identifier) {
    return target !== null && visualModel.hasVisualEntityForRepresented(target);
  } else if (target === identifier) {
    return source !== null && visualModel.hasVisualEntityForRepresented(source);
  }
  return false;
}

function shouldAddProfile(
  visualModel: VisualModel,
  profiled: string,
  profile: SemanticModelClassProfile,
): boolean {
  if (profile.id === profiled) {
    // We do not support self profiles.
    return false;
  }
  if (profile.profiling.includes(profiled)) {
    return visualModel.hasVisualEntityForRepresented(profile.id);
  }
  return false;
}

/**
 * Neighborhood of a class or class profile.
 */
export interface SemanticNeighborhood {

  /**
   * Classes and class profiles.
   */
  nodes: EntityDsIdentifier[];

  /**
   * Relationships, relationship profiles and generalizations.
   */
  edges: EntityDsIdentifier[];

}

/**
 * @returns Classes and class profiles directly connected to given class or
 *  class profile using non-attribute relationships, relationship profiles,
 *  generalizations or profiling.
 */
export function findSemanticNeighborhood(
  entities: Entity[],
  identifier: EntityDsIdentifier,
): SemanticNeighborhood {
  const classes = new Set(entities
    .filter(isClassOrClassProfile)
    .map(item => item.id));
  const nodes: EntityDsIdentifier[] = [];
  const edges: EntityDsIdentifier[] = [];
  const addNode = (node: string | null) => {
    if (node !== null && node !== identifier && classes.has(node)
      && !nodes.includes(node)) {
      nodes.push(node);
    }
  };
  for (const entity of entities) {
    if (isSemanticConnection(entity)) {
      const { source, target } = getSemanticConnectionEndConcepts(entity);
      if (source === identifier && target !== null && classes.has(target)) {
        addNode(target);
        edges.push(entity.id);
      } else if (target === identifier && source !== null && classes.has(source)) {
        addNode(source);
        edges.push(entity.id);
      }
    } else if (isSemanticModelClassProfile(entity)) {
      if (entity.id === identifier) {
        entity.profiling.forEach(addNode);
      } else if (entity.profiling.includes(identifier)) {
        addNode(entity.id);
      }
    }
  }
  return { nodes, edges };
}

/**
 * Find positions for new nodes using layout.
 * Initial position of each node is the barycenter of its neighbors
 * already in the visual model.
 *
 * @param fallbackPosition Used when there are no neighbors.
 */
export async function findPositionsForNewNodes(
  context: CmeExecutionContext,
  visualModel: VisualModel,
  identifiers: EntityDsIdentifier[],
  fallbackPosition: XY,
  dimensions: NodeDimensions | undefined,
): Promise<Record<string, XY>> {
  if (identifiers.length === 0) {
    return {};
  }
  const entities = getAllEntities(context).map(item => item.entity);
  const positions: Record<string, XY> = {};
  const explicitAnchors: ExplicitAnchors = {
    notAnchored: [],
    anchored: [],
    shouldAnchorEverythingExceptNotAnchored:
      AnchorOverrideSetting.AnchorEverythingExceptNotAnchored,
  };
  for (const identifier of identifiers) {
    const barycenter = computeNeighborhoodBarycenter(
      entities, visualModel, identifier);
    if (barycenter === null && identifiers.length === 1) {
      // Single node without neighbors goes to the fallback position.
      return { [identifier]: { ...fallbackPosition } };
    }
    const position = barycenter ?? { ...fallbackPosition };
    // Small deviation, so the nodes are not on top of each other.
    const maxDeviation = 100;
    position.x += Math.floor(Math.random() * maxDeviation) - maxDeviation / 2;
    position.y += Math.floor(Math.random() * maxDeviation) - maxDeviation / 2;
    explicitAnchors.notAnchored.push(identifier);
    positions[identifier] = position;
  }

  const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
  configuration.chosenMainAlgorithm = "elk_stress";
  configuration.main.elk_stress.run_node_overlap_removal_after = true;
  configuration.main.elk_stress.interactive = true;
  configuration.main.elk_stress.number_of_new_algorithm_runs = 1;
  configuration.main.elk_stress.stress_edge_len = 500;

  try {
    // We only read the positions, the visual model is not updated.
    const layoutResult = await performLayoutOfVisualModel(
      { visualModel, outsiders: { ...positions } },
      getEntityModelsForLayout(context),
      configuration,
      createNodeDimensionQueryHandler(dimensions),
      explicitAnchors);
    for (const identifier of identifiers) {
      const layouted = Object.values(layoutResult)
        .map(item => item.visualEntity)
        .find(item => isVisualNode(item)
          && item.representedEntity === identifier);
      if (layouted !== undefined && isVisualNode(layouted)) {
        positions[identifier] = {
          x: layouted.position.x,
          y: layouted.position.y,
        };
      }
    }
  } catch (error) {
    LOG.warn("Layout failed, using initial positions.", { error });
  }
  return positions;
}

/**
 * @returns Barycenter of visible neighbors, or null if there are none.
 */
function computeNeighborhoodBarycenter(
  entities: Entity[],
  visualModel: VisualModel,
  identifier: EntityDsIdentifier,
): XY | null {
  const { nodes } = findSemanticNeighborhood(entities, identifier);
  const positions: XY[] = [];
  for (const node of nodes) {
    for (const visual of visualModel.getVisualEntitiesForRepresented(node)) {
      if (isVisualNode(visual)) {
        positions.push(visual.position);
      }
    }
  }
  if (positions.length === 0) {
    return null;
  }
  return {
    x: positions.reduce((sum, item) => sum + item.x, 0) / positions.length,
    y: positions.reduce((sum, item) => sum + item.y, 0) / positions.length,
  };
}
