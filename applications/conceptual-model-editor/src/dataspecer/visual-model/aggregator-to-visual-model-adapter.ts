import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  isSemanticModelAttribute,
  isSemanticModelRelationship,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isVisualNode,
  isVisualRelationship,
  VisualModel,
  VisualNode,
  VisualRelationship,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import { getDomainAndRange, getDomainAndRangeConcepts } from "../../util/relationship-utils";
import { createLogger } from "../../application";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../semantic-model";
import { Entity } from "@dataspecer/core-v2";

const LOG = createLogger(import.meta.url);

/**
 * @deprecated We should not synchronize on changes, instead we must execute changes directly.
 */
export function updateVisualAttributesBasedOnSemanticChanges(
  visualModel: WritableVisualModel,
  changedItems: AggregatedEntityWrapper[],
  removed: string[],
  previousEntities: Record<string, AggregatedEntityWrapper>
): void {
  for (const identifier of removed) {
    const entity = previousEntities[identifier].aggregatedEntity;
    handleDeletionOfSemanticAttribute(visualModel, entity)
  }

  for (const changedItem of changedItems) {
    const nextEntity = changedItem.aggregatedEntity;
    const previousEntity = previousEntities[changedItem.id]?.aggregatedEntity ?? null;
    handleUpdateOfSemanticAttribute(visualModel, previousEntity, nextEntity);
  }
}

function getDomainNodes(
  visualModel: VisualModel,
  entity: SemanticModelRelationship | SemanticModelRelationshipProfile,
): VisualNode[] {
  let domainConcept;
  if (isSemanticModelAttribute(entity)) {
    const { domain } = getDomainAndRange(entity);
    domainConcept = domain?.concept;
  }
  else {
    const { domain } = getDomainAndRange(entity);
    domainConcept = domain?.concept;
  }
  if (domainConcept === undefined || domainConcept === null) {
    return [];
  }

  const nodes = visualModel.getVisualEntitiesForRepresented(domainConcept);

  if (nodes.length === 0 || !isVisualNode(nodes[0])) {
    // There is no visual for the attribute's domain.
    return [];
  }

  // This should be fine, since if we there is some inconsistency
  // (that is first entity is VisualNode, rest is something else)
  // then we have much bigger issue somewhere else.
  return nodes as VisualNode[];
}

function handleDeletionOfSemanticAttribute(
  visualModel: WritableVisualModel,
  deletedEntity: Entity | null
) {
  const isAttributeOrAttributeProfile = isSemanticModelAttribute(deletedEntity) ||
    isSemanticModelAttributeProfile(deletedEntity);
  if (isAttributeOrAttributeProfile) {
    const nodes = getDomainNodes(visualModel, deletedEntity);

    for (const node of nodes) {
      const newContent = node.content.filter(attributeInNode => attributeInNode !== deletedEntity.id);
      visualModel.updateVisualEntity(node.identifier, { content: newContent });
    }
  }
}

function handleUpdateOfSemanticAttribute(
  visualModel: WritableVisualModel,
  previousEntity: Entity | null,
  nextEntity: Entity | null,
) {
  const isAttributeOrAttributeProfile =
    isSemanticModelAttribute(nextEntity)
    || isSemanticModelAttributeProfile(nextEntity);
  if (!isAttributeOrAttributeProfile) {
    return;
  }
  const wasAttributeOrAttributeProfile =
    isSemanticModelAttribute(previousEntity)
    || isSemanticModelAttributeProfile(previousEntity);

  if (previousEntity === null || !wasAttributeOrAttributeProfile) {
    return;
  }

  const previousNodes = getDomainNodes(visualModel, previousEntity);
  if (previousNodes === null) {
    return;
  }
  const nextNodes = getDomainNodes(visualModel, nextEntity);
  if (nextNodes === null) {
    return;
  }

  if (previousNodes.length > 0 && previousNodes.length === nextNodes.length &&
    previousNodes[0].representedEntity === nextNodes[0].representedEntity) {
    return;
  }

  for (const previousNode of previousNodes) {
    const newContentForPrevious = previousNode.content.filter(attributeInNode => attributeInNode !== previousEntity.id);
    visualModel.updateVisualEntity(previousNode.identifier, { content: newContentForPrevious });
  }

  for (const nextNode of nextNodes) {
    visualModel.updateVisualEntity(nextNode.identifier, { content: nextNode.content.concat([previousEntity.id]) });
  }

}

/**
 * Propagate changes from aggregator to visual model.
 * @deprecated We should not synchronize on changes, instead we must execute changes directly.
 */
export function synchronizeOnAggregatorChange(
  visualModel: WritableVisualModel,
  changedItems: AggregatedEntityWrapper[],
  removed: string[],
): void {
  synchronizeUpdates(visualModel, changedItems);
  synchronizeRemoved(visualModel, removed);
}

function synchronizeUpdates(
  visualModel: WritableVisualModel,
  changedItems: AggregatedEntityWrapper[],
): void {
  for (const item of changedItems) {
    const visuals = visualModel.getVisualEntitiesForRepresented(item.id);
    for (const visual of visuals) {
      // We decide based on the type.
      if (isVisualNode(visual)) {
        updateVisualNode(visualModel, item, visual);
      } else if (isVisualRelationship(visual)) {
        updateVisualRelationship(visualModel, item, visual);
      } else {
        // We just ignore all rest.
        break;
      }
    }
  }
}

function updateVisualNode(
  _visualModel: WritableVisualModel,
  _changed: AggregatedEntityWrapper,
  _visual: VisualNode,
): void {
  // There is no change that would apply to visual node.
}

function updateVisualRelationship(
  visualModel: WritableVisualModel,
  changed: AggregatedEntityWrapper,
  visual: VisualRelationship,
): void {
  // What may changed are the ends of the relationship.
  const entity = changed.aggregatedEntity;

  // The entity must be relationship or a relationship profile.
  if (!isSemanticModelRelationship(entity) && !isSemanticModelRelationshipProfile(entity)) {
    visualModel.deleteVisualEntity(visual.identifier);
    LOG.invalidEntity(
      entity?.id ?? "",
      "Expected relationship or relationship profile.",
      { entity });
    return;
  }

  // Get domain and range.
  const { domain, range } = getDomainAndRangeConcepts(entity);
  console.log("ENTITY", entity, { domain, range });
  if (domain === null || range === null) {
    visualModel.deleteVisualEntity(visual.identifier);
    LOG.invalidEntity(
      entity?.id ?? "",
      "Missing domain or range for aggregated entity.",
      { entity });
    return;
  }

  // Check there is a source and a target.
  const visualSources = visualModel.getVisualEntitiesForRepresented(domain);
  const visualTargets = visualModel.getVisualEntitiesForRepresented(range);
  if (visualSources.length === 0 || visualTargets.length === 0) {
    visualModel.deleteVisualEntity(visual.identifier);
    return;
  }

  // If there was no relevant change, since the semantic ends are the same, then return from method
  const givenVisualSource = visualModel.getVisualEntity(visual.visualSource);
  const isSourceSame = givenVisualSource !== null && visualSources.includes(givenVisualSource);
  const givenVisualTarget = visualModel.getVisualEntity(visual.visualTarget);
  const isTargetSame = givenVisualTarget !== null && visualTargets.includes(givenVisualTarget);
  if (isSourceSame && isTargetSame) {
    return;
  }

  for (const visualSource of visualSources) {
    for (const visualTarget of visualTargets) {
      if (visual.visualSource === visualSource.identifier
        && visual.visualTarget === visualTarget.identifier) {
        // There was no change.
        continue;
      }

      // Update.
      visualModel.updateVisualEntity(visual.identifier, {
        visualSource: visualSource.identifier,
        visualTarget: visualTarget.identifier,
      });
    }
  }

}

function synchronizeRemoved(
  visualModel: WritableVisualModel,
  removed: string[],
): void {
  for (const identifier of removed) {
    const visuals = visualModel.getVisualEntitiesForRepresented(identifier);
    for (const visual of visuals) {
      visualModel.deleteVisualEntity(visual.identifier);
    }
  }
}
