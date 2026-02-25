import { EntityModel } from "@dataspecer/core-v2";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  type VisualNode,
  type VisualRelationship,
  type WritableVisualModel,
  isVisualNode,
  isVisualRelationship,
} from "@dataspecer/visual-model";
import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getDomainAndRangeConcepts } from "../../util/relationship-utils";
import { isSemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

/**
 * Given visual model in version 0 performs migration to version 1, changing content of the model.
 */
export function migrateVisualModelFromV0(
  models: EntityModel[],
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
  models: EntityModel[],
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
  } else if (isSemanticModelClassProfile(representedEntity)) {
    // It is a profile.
    representedEntity.profiling
      .map(item => entities[item])
      .map(item => visualModel.getVisualEntitiesForRepresented(item.id)[0])
      .filter(item => item !== undefined)
      .forEach(item => {
        // There is a visual representation, we add a relation.
        visualModel.addVisualProfileRelationship({
          entity: representedEntity.id,
          model: representedModel.getId(),
          waypoints: [],
          visualSource: entity.identifier,
          visualTarget: item.identifier,
        });
      })
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
  models: EntityModel[],
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
  if (isSemanticModelClass(representedEntity)) {
    // Type miss match.
    visualModel.deleteVisualEntity(entity.identifier);
    return;
  }

  // We need to find ends of the relationship in the visual model.
  if (isSemanticModelRelationship(representedEntity)) {
    const { domain, range } = getDomainAndRangeConcepts(representedEntity);
    if (domain === null || range === null) {
      // Invalid entity.
      visualModel.deleteVisualEntity(entity.identifier);
      return;
    }
    const visualSource = visualModel.getVisualEntitiesForRepresented(domain)[0];
    const visualTarget = visualModel.getVisualEntitiesForRepresented(range)[0];
    if (visualSource === undefined || visualTarget === undefined) {
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
    const visualSource = visualModel.getVisualEntitiesForRepresented(representedEntity.child)[0];
    const visualTarget = visualModel.getVisualEntitiesForRepresented(representedEntity.parent)[0];
    if (visualSource === undefined || visualTarget === undefined) {
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

const findSourceModelOfEntity = (
  entityIdentifier: string,
  models: EntityModel[]
): EntityModel | null => {
  for (const model of models) {
    const entities = model.getEntities();
    if (entities[entityIdentifier] === undefined) {
      continue;
    }
    return model;
  }
  return null;
};

/**
 * Model v0 saved does not removed data about semantic
 * models once they have been removed.
 *
 * To keep the visual model clean, we remove information
 * about all missing models.
 */
function removeUnusedModelData(
  models: EntityModel[],
  visualModel: WritableVisualModel,
) {
  for (const [identifier, _] of visualModel.getModelsData()) {
    if (models.find(model => model.getId() === identifier) !== undefined) {
      continue;
    }
    // The model is missing, we delete the information.
    visualModel.deleteModelData(identifier);
  }
}
