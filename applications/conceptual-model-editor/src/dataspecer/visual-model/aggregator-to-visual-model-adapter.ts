import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import { isSemanticModelAttribute, isSemanticModelRelationship, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isVisualNode, isVisualProfileRelationship, isVisualRelationship, VisualModel, VisualNode, VisualProfileRelationship, VisualRelationship, WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import { isSemanticModelAttributeUsage, isSemanticModelClassUsage, isSemanticModelRelationshipUsage, SemanticModelRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";

import { getDomainAndRange, getDomainAndRangeConcepts } from "../../util/relationship-utils";
import { createLogger } from "../../application";
import { EntityDsIdentifier } from "../entity-model";
import { isSemanticModelRelationshipProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../semantic-model";
import { Entity } from "@dataspecer/core-v2";

const LOG = createLogger(import.meta.url);

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

function getDomainNode(
  visualModel: VisualModel,
  entity: SemanticModelRelationship | SemanticModelRelationshipUsage | SemanticModelRelationshipProfile
): VisualNode | null {
    let domainConcept;
    if(isSemanticModelAttribute(entity)) {
      const { domain } = getDomainAndRange(entity);
      domainConcept = domain?.concept;
    }
    else {
      const { domain } = getDomainAndRange(entity);
      domainConcept = domain?.concept;
    }
    if(domainConcept === undefined || domainConcept === null) {
      return null;
    }

    const node = visualModel.getVisualEntityForRepresented(domainConcept);

    if (node === null || !isVisualNode(node)) {
      // There is no visual for the attribute's domain.
      return null;
    }

    return node;
}

function handleDeletionOfSemanticAttribute(
  visualModel: WritableVisualModel,
  deletedEntity: Entity | null
) {
  const isAttributeOrAttributeProfile = isSemanticModelAttribute(deletedEntity) ||
                        isSemanticModelAttributeProfile(deletedEntity) ||
                        isSemanticModelAttributeUsage(deletedEntity);
  if(isAttributeOrAttributeProfile) {
    const node = getDomainNode(visualModel, deletedEntity);
    if(node === null) {
      return;
    }

    const newContent = node.content.filter(attributeInNode => attributeInNode !== deletedEntity.id);
    visualModel.updateVisualEntity(node.identifier, {content: newContent});
  }
}

function handleUpdateOfSemanticAttribute(
  visualModel: WritableVisualModel,
  previousEntity: Entity | null,
  nextEntity: Entity | null,
) {
  const isAttributeOrAttributeProfile = isSemanticModelAttribute(nextEntity) ||
                        isSemanticModelAttributeProfile(nextEntity) ||
                        isSemanticModelAttributeUsage(nextEntity);
  if(!isAttributeOrAttributeProfile) {
    return;
  }
  const wasAttributeOrAttributeProfile = isSemanticModelAttribute(previousEntity) ||
          isSemanticModelAttributeProfile(previousEntity) ||
          isSemanticModelAttributeUsage(previousEntity);

  if(previousEntity === null || !wasAttributeOrAttributeProfile) {
    return;
  }


  const previousNode = getDomainNode(visualModel, previousEntity);
  if(previousNode === null) {
    return;
  }
  const nextNode = getDomainNode(visualModel, nextEntity);
  if(nextNode === null) {
    return;
  }
  if(previousNode === nextNode) {
    return;
  }

  const newContentForPrevious = previousNode.content.filter(attributeInNode => attributeInNode !== previousEntity.id);
  visualModel.updateVisualEntity(previousNode.identifier, {content: newContentForPrevious});

  visualModel.updateVisualEntity(nextNode.identifier, {content: nextNode.content.concat([previousEntity.id])});

  // TODO RadStr: Debug
  console.info("Updating attribute", {previousNode, nextNode});
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
    const visual = visualModel.getVisualEntityForRepresented(item.id);
    if (visual === null) {
      // There is no representation, so no change to propagate.
      continue;
    }
    // We decide based on the type.
    if (isVisualNode(visual)) {
      updateVisualNode(visualModel, item, visual);
    } else if (isVisualRelationship(visual)) {
      updateVisualRelationship(visualModel, item, visual);
    } else if (isVisualProfileRelationship(visual)) {
      updateVisualProfileRelationship(visualModel, item, visual);
    } else {
      // We just ignore all rest.
      continue;
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
  if (!isSemanticModelRelationship(entity)
    && !isSemanticModelRelationshipUsage(entity)
    && !isSemanticModelRelationshipProfile(entity)) {
    visualModel.deleteVisualEntity(visual.identifier);
    LOG.invalidEntity(
      entity?.id ?? "",
      "Expected relationship or relationship profile.",
      { entity });
    return;
  }

  // Get domain and range.
  const { domain, range } = getDomainAndRangeConcepts(entity);
  console.log("ENTITY", entity, {domain, range});
  if (domain === null || range === null) {
    visualModel.deleteVisualEntity(visual.identifier);
    LOG.invalidEntity(
      entity?.id ?? "",
      "Missing domain or range for aggregated entity.",
      { entity });
    return;
  }

  // Check there is a source and a target.
  const visualSource = visualModel.getVisualEntityForRepresented(domain);
  const visualTarget = visualModel.getVisualEntityForRepresented(range);
  if (visualSource === null || visualTarget === null) {
    visualModel.deleteVisualEntity(visual.identifier);
    return;
  }

  if (visual.visualSource === visualSource.identifier
    && visual.visualTarget === visualTarget.identifier) {
    // There was no change.
    return;
  }

  // Update.
  visualModel.updateVisualEntity(visual.identifier, {
    visualSource: visualSource.identifier,
    visualTarget: visualTarget.identifier,
  });

}

function updateVisualProfileRelationship(
  visualModel: WritableVisualModel,
  changed: AggregatedEntityWrapper,
  visual: VisualProfileRelationship,
): void {
  const entity = changed.aggregatedEntity;
  if (isSemanticModelClassUsage(entity)) {
    updateVisualProfileRelationshipForEnds(
      visualModel, entity.id, entity.usageOf, visual);
  } else if (isSemanticModelRelationshipUsage(entity)) {
    updateVisualProfileRelationshipForEnds(
      visualModel, entity.id, entity.usageOf, visual);
  }
}

function updateVisualProfileRelationshipForEnds(
  visualModel: WritableVisualModel,
  profiled: EntityDsIdentifier,
  profile: EntityDsIdentifier,
  visual: VisualProfileRelationship,
): void {
  const visualSource = visualModel.getVisualEntityForRepresented(profiled);
  const visualTarget = visualModel.getVisualEntityForRepresented(profile);
  if (visualSource === null || visualTarget === null) {
    visualModel.deleteVisualEntity(visual.identifier);
    return;
  }

  if (visual.visualSource === visualSource.identifier
    && visual.visualTarget === visualTarget.identifier) {
    // There was no change.
    return;
  }

  // Update.
  visualModel.updateVisualEntity(visual.identifier, {
    visualSource: visualSource.identifier,
    visualTarget: visualTarget.identifier,
  });
}

function synchronizeRemoved(
  visualModel: WritableVisualModel,
  removed: string[],
): void {
  for (const identifier of removed) {
    const visual = visualModel.getVisualEntityForRepresented(identifier);
    if (visual === null) {
      // There is no visual for the entity.
      continue;
    }
    visualModel.deleteVisualEntity(visual.identifier);
  }
}
