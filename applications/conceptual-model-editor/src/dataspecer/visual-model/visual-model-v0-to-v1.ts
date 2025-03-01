import { EntityModel } from "@dataspecer/core-v2";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import { VisualNode, VisualRelationship, WritableVisualModel, isVisualNode, isVisualRelationship } from "@dataspecer/core-v2/visual-model";
import { isSemanticModelAttribute, isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelAttributeUsage, isSemanticModelClassUsage, isSemanticModelRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";

import { findSourceModelOfEntity } from "../../service/model-service";
import { getDomainAndRange, getDomainAndRangeConcepts } from "../../util/relationship-utils";
import { isSemanticModelAttributeProfile } from "../semantic-model";


export function validateVisualModelAttributes(
  entities: Record<string, AggregatedEntityWrapper>,
  visualModel: WritableVisualModel,
) {
  console.log("Validating visual model's attributes visibility.")
  for (const entity of visualModel.getVisualEntities().values()) {
    if (isVisualNode(entity)) {
      const newContent: string[] = [];
      for(const attributeIdentifier of entity.content) {
        const attribute = entities[attributeIdentifier]?.aggregatedEntity;
        if(attribute === undefined || attribute === null) {
          continue;
        }
        const isAttributeOrAttributeProfile = isSemanticModelAttribute(attribute) ||
                                              isSemanticModelAttributeProfile(attribute) ||
                                              isSemanticModelAttributeUsage(attribute);
        if(!isAttributeOrAttributeProfile) {
          continue;
        }

        let actualDomainConcept: string | null = null;
        if(isSemanticModelAttribute(attribute)) {
          const { domain } = getDomainAndRange(attribute);
          actualDomainConcept = domain?.concept ?? null;
        }
        else {
          const { domain } = getDomainAndRange(attribute);
          actualDomainConcept = domain?.concept ?? null;
        }

        if(actualDomainConcept === null || actualDomainConcept !== entity.representedEntity) {
          continue;
        }

        newContent.push(attributeIdentifier);
      }

      if(newContent.length === entity.content.length) {
        continue;
      }
      visualModel.updateVisualEntity(entity.identifier, { content: newContent });
    }
  }
}

/**
 * Given visual model in version 0 performs migration to version 1, changing content of the model.
 */
export function migrateVisualModelFromV0(
  models: Map<string, EntityModel>,
  entities: Record<string, AggregatedEntityWrapper>,
  visualModel: WritableVisualModel,
) {
  console.log("Running migration of visual model version 0 to version 1.")
  for (const entity of visualModel.getVisualEntities().values()) {
    if (isVisualNode(entity)) {
      migrateVisualNode(entities, models, visualModel, entity);
    } else if (isVisualRelationship(entity)) {
      migrateVisualRelationship(entities, models, visualModel, entity);
    }
  }
  removeUnusedModelData(models, visualModel);
}

function migrateVisualNode(
  entities: Record<string, AggregatedEntityWrapper>,
  models: Map<string, EntityModel>,
  visualModel: WritableVisualModel,
  entity: VisualNode,
) {
  // Remove if there is no represented entity.
  const represented = entities[entity.representedEntity];
  if (represented === undefined) {
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // Check entity is in a model.
  // We should always find a model, but we need to
  // deal with situation when it does not happen.
  const representedModel = findSourceModelOfEntity(represented.id, models);
  if (representedModel === null) {
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // Check visual node represents class or class profile.
  // In addition we need to add a profile relation for a profile.
  const representedEntity = represented.aggregatedEntity;
  if (isSemanticModelClass(representedEntity)) {
    // This is ok.
  } else if (isSemanticModelClassUsage(representedEntity)) {
    // It is a profile.
    const usageOf = entities[representedEntity.usageOf];
    const usageVisual = visualModel.getVisualEntityForRepresented(usageOf.id);
    if (usageVisual === null) {
      // There is no visual representation.
    } else {
      // There is a visual representation, we add a relation.
      visualModel.addVisualProfileRelationship({
        entity: representedEntity.id,
        model: representedModel.getId(),
        waypoints: [],
        visualSource: entity.identifier,
        visualTarget: usageVisual.identifier,
      });
    }
  } else {
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // We add new information that was missing in the previous model version.
  visualModel.updateVisualEntity(
    entity.identifier, { model: representedModel.getId() });
}

function migrateVisualRelationship(
  entities: Record<string, AggregatedEntityWrapper>,
  models: Map<string, EntityModel>,
  visualModel: WritableVisualModel,
  entity: VisualRelationship,
) {
  // Remove if there is no represented entity.
  const represented = entities[entity.representedRelationship];
  if (represented === undefined) {
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // Check entity is in a model.
  // We should always find a model, but we need to
  // deal with situation when it does not happen.
  const representedModel = findSourceModelOfEntity(represented.id, models);
  if (representedModel === null) {
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // We check that relationship represents a relationship.
  // Instead of a positive check, we use a negative one, so we
  // check for representation of non-relations.
  const representedEntity = represented.aggregatedEntity;
  if (isSemanticModelClass(representedEntity)
    || isSemanticModelClassUsage(representedEntity)) {
    // Type miss match.
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // We need to find ends of the relationship in the visual model.
  if (isSemanticModelRelationship(representedEntity) || isSemanticModelRelationshipUsage(representedEntity)) {
    const { domain, range } = getDomainAndRangeConcepts(representedEntity);
    if (domain === null || range === null) {
      // Invalid entity.
      visualModel.deleteVisualEntity(entity.identifier);
      return;
    }
    const visualSource = visualModel.getVisualEntityForRepresented(domain);
    const visualTarget = visualModel.getVisualEntityForRepresented(range);
    if (visualSource === null || visualTarget === null) {
      // Ends are not in the visual model.
      visualModel.deleteVisualEntity(entity.identifier);
      return;
    }
    // We add new information that was missing in the previous model version.
    visualModel.updateVisualEntity(entity.identifier, {
      model: representedModel.getId(),
      visualSource: visualSource.identifier,
      visualTarget: visualTarget.identifier,
    });
  } else if (isSemanticModelGeneralization(representedEntity)) {
    const visualSource = visualModel.getVisualEntityForRepresented(representedEntity.child);
    const visualTarget = visualModel.getVisualEntityForRepresented(representedEntity.parent);
    if (visualSource === null || visualTarget === null) {
      // Ends are not in the visual model.
      visualModel.deleteVisualEntity(entity.identifier);
      return;
    }
    // We add new information that was missing in the previous model version.
    visualModel.updateVisualEntity(entity.identifier, {
      model: representedModel.getId(),
      visualSource: visualSource.identifier,
      visualTarget: visualTarget.identifier,
    });
  } else {
    // Unknown type of visual relation in this version.
    visualModel.deleteVisualEntity(entity.identifier);
  }
}

/**
 * Model v0 saved does not removed data about semantic
 * models once they have been removed.
 *
 * To keep the visual model clean, we remove information
 * about all missing models.
 */
function removeUnusedModelData(
  models: Map<string, EntityModel>,
  visualModel: WritableVisualModel,
) {
  for (const [identifier, _] of visualModel.getModelsData()) {
    if (models.has(identifier)) {
      continue;
    }
    // The model is missing, we delete the information.
    visualModel.deleteModelData(identifier);
  }
}