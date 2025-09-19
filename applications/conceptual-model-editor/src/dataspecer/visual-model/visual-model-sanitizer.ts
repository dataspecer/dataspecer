import { EntityModel } from "@dataspecer/core-v2";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import { isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isModelVisualInformation, isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { getDomainAndRangeConcepts } from "../../util/relationship-utils";

/**
 * Perform in-place sanitization of the visual model.
 *
 * @param models
 * @param entities
 * @param visualModel
 */
export function sanitizeVisualModel(
  models: EntityModel[],
  entities: Record<string, AggregatedEntityWrapper>,
  visualModel: WritableVisualModel,
) {
  const modelIdentifiers = new Set(models.map(item => item.getId()));
  // We iterate over all entities and perform validation steps.
  for (const entity of visualModel.getVisualEntities().values()) {
    if (isVisualNode(entity)) {
      const sanitizedContent = sanitizeVisualNodeContent(
        entities, entity.representedEntity, entity.content);
      if (entity.content !== sanitizedContent) {
        visualModel.updateVisualEntity(
          entity.identifier, { content: sanitizedContent });
      }
    }
    if (isModelVisualInformation(entity)) {
      if (!modelIdentifiers.has(entity.representedModel)) {
        // The model is no longer part of the visual model.
        visualModel.deleteVisualEntity(entity.identifier);
      }
    }
  }
}

/**
 * Remove visual node content items, that are not part of a semantic model.
 * Must return the original array when there is no change.
 */
export function sanitizeVisualNodeContent(
  entities: Record<string, AggregatedEntityWrapper>,
  representedEntity: string,
  content: string[],
): string[] {
  let hasChanged = false;
  const result: string[] = [];
  for (const identifier of content) {
    const entity = entities[identifier]?.aggregatedEntity;
    // First we check that the represented entity exists.
    if (entity === undefined || entity === null) {
      hasChanged = true;
      continue;
    }
    // Next we check that we are the domain.
    if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) {
      const { domain } = getDomainAndRangeConcepts(entity);
      if (domain !== representedEntity) {
        hasChanged = true;
        continue;
      }
    }
    result.push(identifier);
  }
  return hasChanged ? result : content;
}
