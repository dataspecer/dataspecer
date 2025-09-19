import { WritableVisualModel } from "@dataspecer/visual-model";
import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { getSelectionForWholeSemanticModel } from "./extend-selection-action";
import {
  EntityToAddToVisualModel,
  addSemanticEntitiesToVisualModelAction
} from "./add-semantic-entities-to-visual-model";
import { ClassesContextType } from "../context/classes-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { EntityModel } from "@dataspecer/core-v2";
import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelRelationship,
  SemanticModelClass,
  SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { getDomainAndRange } from "../util/relationship-utils";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";

/**
 * Adds entities from given semantic model identified by
 * {@link semanticModelIdentifier} to currently active visual model.
 */
export const addEntitiesFromSemanticModelToVisualModelAction = async (
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  semanticModel: EntityModel
): Promise<void> => {
  // Passing in true, because the classic relationships are added by default when adding class
  // while the relationship profiles are not
  const entitiesFromSemanticModel = getSelectionForWholeSemanticModel(semanticModel, visualModel, true);

  let entitiesToAddToVisualModel: EntityToAddToVisualModel[] = entitiesFromSemanticModel.nodeSelection.map(node => ({
    identifier: node,
    position: null,
  }));

  entitiesToAddToVisualModel.push(
    ...entitiesFromSemanticModel.edgeSelection.map(edge => ({ identifier: edge, position: null })));
  // Find those which are not already on canvas.
  entitiesToAddToVisualModel = entitiesToAddToVisualModel
    .filter(entity => !visualModel.hasVisualEntityForRepresented(entity.identifier));

  const classesPresentOnCanvas = entitiesFromSemanticModel.nodeSelection
    .filter(identifier => visualModel.hasVisualEntityForRepresented(identifier))
    .map(identifier => classesContext.rawEntities.find(entity => entity?.id === identifier))
    .filter(entity => entity !== null && entity !== undefined)
    .filter(entity => isSemanticModelClass(entity) || isSemanticModelClassProfile(entity));

  await addSemanticEntitiesToVisualModelAction(
    notifications, classesContext, graph, visualModel, diagram, entitiesToAddToVisualModel);

  addHiddenAttributesForExistingClassesAndClassProfiles(
    notifications, classesContext, visualModel, classesPresentOnCanvas);
};

function addHiddenAttributesForExistingClassesAndClassProfiles(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  visualModel: WritableVisualModel,
  classesPresentOnCanvas: (SemanticModelClass | SemanticModelClassProfile)[]
): void {
  const attributes = classesContext.relationships.filter(isSemanticModelAttribute);
  const attributeProfiles = classesContext.relationshipProfiles.filter(isSemanticModelAttributeProfile);

  const allAttributes = ([] as (SemanticModelRelationship | SemanticModelRelationshipProfile)[])
    .concat(attributes).concat(attributeProfiles);

  for (const classPresentOnCanvas of classesPresentOnCanvas) {
    for(const attribute of allAttributes) {
      if(isSemanticModelRelationship(attribute)) {
        const { domain } = getDomainAndRange(attribute);
        if(domain?.concept !== classPresentOnCanvas.id) {
          continue;
        }
      }
      else {
        const { domain } = getDomainAndRange(attribute);
        if(domain?.concept !== classPresentOnCanvas.id) {
          continue;
        }
      }
      addSemanticAttributeToVisualModelAction(
        notifications, visualModel, classPresentOnCanvas.id, attribute.id, false);
    }
  }
}
