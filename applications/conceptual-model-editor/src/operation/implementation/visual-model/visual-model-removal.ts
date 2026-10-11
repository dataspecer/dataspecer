import { Entity } from "@dataspecer/core-v2";
import {
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  isVisualGroup,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualEntity,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import { createLogger } from "../../../application";
import { getDomainAndRangeConcepts } from "../../../util/relationship-utils";
import {
  findTopLevelGroupInVisualModel,
  getClassToVisualDiagramNodeMapping,
  getGroupMappings,
  isVisualEdgeEnd,
} from "./visual-model-utilities";

const LOG = createLogger(import.meta.url);

/**
 * @returns Visual entities for given identifiers together with all edges
 *  and groups connected to them.
 *  Visual diagram nodes containing the entities are not considered.
 */
export function collectDirectVisualEntitiesToRemove(
  visualModel: VisualModel,
  identifiers: string[],
  getVisualEntitiesForIdentifier: (identifier: string) => VisualEntity[],
): VisualEntity[] {
  const result: VisualEntity[] = [];
  for (const identifier of identifiers) {
    for (const visualEntity of getVisualEntitiesForIdentifier(identifier)) {
      result.push(...collectConnectedVisualEntities(visualModel, visualEntity));
      result.push(visualEntity);
    }
  }
  return result;
}

function collectConnectedVisualEntities(
  visualModel: VisualModel,
  removedEntity: VisualEntity,
): VisualEntity[] {
  if (!isVisualEdgeEnd(removedEntity)) {
    return [];
  }
  return [...visualModel.getVisualEntities().values()].filter(entity => {
    if (isVisualRelationship(entity) || isVisualProfileRelationship(entity)) {
      return entity.visualSource === removedEntity.id
        || entity.visualTarget === removedEntity.id;
    } else if (isVisualGroup(entity)) {
      return entity.content.includes(removedEntity.id);
    }
    return false;
  });
}

/**
 * @returns Edges going from visual diagram nodes which are no longer valid,
 *  because given classes, contained in the diagram nodes, are removed.
 */
export function collectInvalidVisualDiagramNodeEdges(
  entities: Entity[],
  availableVisualModels: Map<string, VisualModel>,
  visualModel: VisualModel,
  removedClasses: string[],
): VisualEntity[] {
  const result: VisualEntity[] = [];
  const mapping = getClassToVisualDiagramNodeMapping(
    availableVisualModels, visualModel);

  const getVisualEntitiesForVisual = (identifier: string) => {
    const visualEntity = visualModel.getVisualEntity(identifier);
    return visualEntity === null ? [] : [visualEntity];
  };

  for (const removedClass of removedClasses) {
    const visualDiagramNodes = [...new Set(mapping[removedClass] ?? [])];
    const candidates = collectDirectVisualEntitiesToRemove(
      visualModel, visualDiagramNodes, getVisualEntitiesForVisual);
    for (const candidate of candidates) {
      if (isVisualRelationship(candidate)) {
        const represented = entities.find(
          item => item.id === candidate.representedRelationship);
        if (represented === undefined || !(
          isSemanticModelRelationship(represented)
          || isSemanticModelRelationshipProfile(represented))) {
          LOG.error("Missing represented relationship.", { candidate });
          continue;
        }
        const source = visualModel.getVisualEntity(candidate.visualSource);
        const target = visualModel.getVisualEntity(candidate.visualTarget);
        const isSourceNode = source !== null && isVisualNode(source);
        const isTargetNode = target !== null && isVisualNode(target);
        if (isSourceNode === isTargetNode) {
          // We need exactly one end to be a node.
          continue;
        }
        const { domain, range } = getDomainAndRangeConcepts(represented);
        if ((domain === removedClass && isSourceNode)
          || (range === removedClass && isTargetNode)) {
          result.push(candidate);
        }
      } else if (isVisualProfileRelationship(candidate)) {
        const profile = entities.find(item => item.id === candidate.entity);
        if (profile === undefined || !isSemanticModelClassProfile(profile)) {
          LOG.error("Missing represented class profile.", { candidate });
          continue;
        }
        if (profile.id === removedClass
          || profile.profiling.includes(removedClass)) {
          result.push(candidate);
        }
      }
    }
  }
  return result;
}

/**
 * Remove given visual entities, groups are reduced instead of being
 * removed directly.
 */
export function removeVisualEntities(
  visualModel: WritableVisualModel,
  entitiesToRemove: VisualEntity[],
): void {
  const identifiersToRemove = entitiesToRemove.map(entity => entity.id);
  const removedGroups = new Set<string>();
  const removed = new Set<string>();
  for (const entity of entitiesToRemove) {
    if (isVisualGroup(entity)) {
      if (removedGroups.has(entity.id)) {
        continue;
      }
      const isGroupRemoved = removePartOfGroupContent(
        visualModel, entity.id, identifiersToRemove);
      if (isGroupRemoved) {
        removedGroups.add(entity.id);
      }
      continue;
    }
    if (removed.has(entity.id)) {
      // The same entity can be collected multiple times.
      continue;
    }
    if (visualModel.getVisualEntity(entity.id) === null) {
      continue;
    }
    visualModel.deleteVisualEntity(entity.id);
    removed.add(entity.id);
  }
}

/**
 * Removes part of group's content.
 * Empty group is deleted, top level group with a single item is deleted too.
 *
 * @returns True if the whole group was deleted.
 */
export function removePartOfGroupContent(
  visualModel: WritableVisualModel,
  groupIdentifier: string,
  contentToRemove: string[],
): boolean {
  const group = visualModel.getVisualEntity(groupIdentifier);
  if (group === null || !isVisualGroup(group)) {
    return false;
  }
  const nextContent = group.content
    .filter(item => !contentToRemove.includes(item));
  const topLevelGroup = findTopLevelGroupInVisualModel(
    groupIdentifier, visualModel);
  if (nextContent.length === 0
    || (nextContent.length === 1 && topLevelGroup === groupIdentifier)) {
    removeGroup(visualModel, groupIdentifier);
    return true;
  }
  if (group.content.length !== nextContent.length) {
    visualModel.updateVisualEntity(groupIdentifier, { content: nextContent });
  }
  return false;
}

/**
 * Remove the group and remove it from all other groups.
 */
export function removeGroup(
  visualModel: WritableVisualModel,
  identifier: string,
): void {
  const { existingGroups } = getGroupMappings(visualModel);
  visualModel.deleteVisualEntity(identifier);
  for (const existingGroupIdentifier of Object.keys(existingGroups)) {
    // The group might have been removed in cascade.
    if (existingGroupIdentifier === identifier
      || visualModel.getVisualEntity(existingGroupIdentifier) === null) {
      continue;
    }
    removePartOfGroupContent(visualModel, existingGroupIdentifier, [identifier]);
  }
}
