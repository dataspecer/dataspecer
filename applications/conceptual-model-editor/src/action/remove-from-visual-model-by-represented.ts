import {
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualEntity,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { collectDirectVisualEntitiesToRemove } from "./remove-from-visual-model-by-visual";
import { removeVisualEntitiesFromVisualModelAction } from "./remove-visual-entities-from-visual-model";
import { ModelGraphContextType } from "@/context/model-context";
import { getVisualDiagramNodeMappingsByRepresented } from "./utilities";
import { ClassesContextType } from "@/context/classes-context";
import { getDomainAndRangeConcepts } from "@/util/relationship-utils";

/**
 * Remove entity and related entities from visual model.
 */
export function removeFromVisualModelByRepresentedAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classesContext: ClassesContextType,
  visualModel: WritableVisualModel,
  identifiers: string[],
) {
  const entitiesToRemove = collectIndirectVisualEntitiesToRemove(
    notifications, graph, classesContext, visualModel, identifiers);
  removeVisualEntitiesFromVisualModelAction(notifications, visualModel, entitiesToRemove);
}

function collectIndirectVisualEntitiesToRemove(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classesContext: ClassesContextType,
  visualModel: WritableVisualModel,
  semanticIdentifiers: string[],
) {

  const getVisualEntitiesForRepresented = (identifier: string) => {
    return visualModel.getVisualEntitiesForRepresented(identifier);
  };

  const directEntitiesToRemove = collectDirectVisualEntitiesToRemove(
    visualModel, semanticIdentifiers, getVisualEntitiesForRepresented, false);

  const availableVisualModels = graph.aggregatorView.getAvailableVisualModels();
  const indirectEntitesToRemove = findInvalidVisualEdgesForVisualDiagramNodes(
    notifications, classesContext, availableVisualModels, visualModel, semanticIdentifiers);

  return directEntitiesToRemove.concat(indirectEntitesToRemove);
}

/**
 * @returns Finds visual relationships ({@link VisualRelationship} and {@link VisualProfileRelationship})
 *  which should no longer be in visual model, because the class, which was hidden in the {@link VisualDiagramNode}
 *  was removed from semantic model. The classes are found in {@link removedClasses}
 */
function findInvalidVisualEdgesForVisualDiagramNodes(
  notifications: UseNotificationServiceWriterType | null,
  classesContext: ClassesContextType,
  availableVisualModels: VisualModel[],
  visualModel: VisualModel,
  removedClasses: string[],
): VisualEntity[] {

  const invalidVisualEntities: VisualEntity[] = [];
  const semanticRelationships = [
    ...classesContext.relationships,
    ...classesContext.relationshipProfiles
  ];

  const { classToVisualDiagramNodeMappingRaw } = getVisualDiagramNodeMappingsByRepresented(
    availableVisualModels, visualModel);

  const getVisualEntitiesForVisual = (identifier: string) => {
    const visualEntity = visualModel.getVisualEntity(identifier);
    return visualEntity === null ? [] : [visualEntity];
  };

  for(const removedClass of removedClasses) {
    const visualDiagramNodes = [...new Set(classToVisualDiagramNodeMappingRaw[removedClass])];
    const entitiesRelatedToDiagramNodes = collectDirectVisualEntitiesToRemove(
      visualModel, visualDiagramNodes, getVisualEntitiesForVisual, true);

    for(const visualEntityRelatedToVisualDiagramNode of entitiesRelatedToDiagramNodes) {
      if(isVisualRelationship(visualEntityRelatedToVisualDiagramNode)) {
        const represented = semanticRelationships
          .find(relationship => visualEntityRelatedToVisualDiagramNode.representedRelationship === relationship.id);
        if(represented === undefined) {
          if(notifications !== null) {
            notifications.error("For some reason the represented for edge does not exist when collecting entities to remove");
          }
          continue;
        }

        // Check if exactly one end is visual node
        const source = visualModel.getVisualEntity(visualEntityRelatedToVisualDiagramNode.visualSource);
        const target = visualModel.getVisualEntity(visualEntityRelatedToVisualDiagramNode.visualTarget);
        const isSourceVisualNode = source !== null && isVisualNode(source);
        const isTargetVisualNode = target !== null && isVisualNode(target);
        const isExactlyOneEndVisualNode = (!isSourceVisualNode && isTargetVisualNode) ||
                                          (isSourceVisualNode && !isTargetVisualNode);
        if(!isExactlyOneEndVisualNode) {
          continue;
        }

        // Compare the semantic ends
        const { domain, range } = getDomainAndRangeConcepts(represented);
        if((domain === removedClass && isSourceVisualNode) || (range === removedClass && isTargetVisualNode)) {
          invalidVisualEntities.push(visualEntityRelatedToVisualDiagramNode);
        }
      }
      else if(isVisualProfileRelationship(visualEntityRelatedToVisualDiagramNode)) {
        const relevantClassProfile = classesContext.classProfiles
          .find(classProfile => visualEntityRelatedToVisualDiagramNode.entity === classProfile.id);
        if(relevantClassProfile === undefined) {
          if(notifications !== null) {
            notifications.error(
              "There exists edge representing class profile, but the class profile is not present in semantic model");
          }
          continue;
        }
        if(relevantClassProfile.id === removedClass || relevantClassProfile.profiling.includes(removedClass)) {
          invalidVisualEntities.push(visualEntityRelatedToVisualDiagramNode);
        }
      }
    }
  }

  return invalidVisualEntities;
}