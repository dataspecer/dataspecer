import {
  isVisualDiagramNode,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  isWritableVisualModel,
  VisualDiagramNode,
  VisualEntity,
  VisualModel,
  VisualNode,
  VisualProfileRelationship,
  WritableVisualModel
} from "@dataspecer/visual-model";
import { EntityModel } from "@dataspecer/core-v2";
import {
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  SemanticModelGeneralization,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { ActionsContextType } from "./action/actions-react-binding";
import { UseClassesContextType } from "./context/classes-context";
import { createLogger } from "./application";
import { addToRecordArray } from "./utilities/functional";
import { findSourceModelOfEntity } from "./service/model-service";
import {
  createGetVisualEntitiesForRepresentedGlobalWrapper,
  VisualsForRepresentedWrapper,
} from "./util/utils";
import { getSemanticConnectionEndConcepts } from "./util/relationship-utils";

const LOG = createLogger(import.meta.url);

/**
 * Validates correctness (not complete) of visual model based on semantic data and modifies it based on it.
 * There are 2 implementations shortcuts
 *
 * 1) Don't show visual profile relationships going from/to visual diagram nodes. - Honestly this seems ok to me
 * 2) Visual profile relationships between classes are always shown when validating. - Might be issue in future
 *
 * One drawback is that if we edit relationship ends, the edge is removed in the other models.
 * That being said it is still better than current solution, where the edge stays without change,
 * therefore it is incorrect.
 *
 * Also when end is changed in current visual model and one of the ends is in visual diagram node after then edit,
 * then such edge is also removed from visual model.
 */
export function validateVisualModel(
  actions: ActionsContextType,
  visualModel: VisualModel | null,
  visualModels: VisualModel[],
  classesContext: UseClassesContextType,
  models: Map<string, EntityModel>
) {
  if(!isWritableVisualModel(visualModel) || visualModel === null) {
    return;
  }

  const allClasses = [
    ...classesContext.classes,
    ...classesContext.classProfiles,
  ].map(item => item.id);

  const relationships = [
    ...classesContext.relationships,
    ...classesContext.generalizations,
    ...classesContext.relationshipProfiles,
  ];

  validateVisualModelAgainstDiagramNodes(
    actions, visualModel, visualModels, allClasses, relationships);
  validateClassProfilesInsideVisualModel(
    actions, visualModel, classesContext, models);
}

/**
 * Validates the class profiles inside visual model, meaning those which have not on end the visual diagram node.
 */
function validateClassProfilesInsideVisualModel(
  actions: ActionsContextType,
  visualModel: WritableVisualModel,
  classesContext: UseClassesContextType,
  models: Map<string, EntityModel>,
) {
  const missingVisualProfileRelationships: Omit<VisualProfileRelationship, "identifier" | "type">[] = [];
  const invalidEntities: string[] = [];
  // Map the visual entity it is profile (that is visualTarget) of to its relationships
  const validVisualProfileRelationships: Record<string, VisualProfileRelationship[]> = {};
  // Map the visual entity id to the visual entity and class profile it represents
  const classProfilesInVisualModel: Record<string,
    {
      visualEntity: VisualNode,
      classProfile: SemanticModelClassProfile
    }> = {};

  // For now just validate the class profile edges, they are currently not removed from visual model.
  // That was the case even when we had only 1 visual model.
  for (const [_id, visualEntity] of visualModel.getVisualEntities()) {
    if (isVisualProfileRelationship(visualEntity)) {    // Find the invalid ones
      const source = visualModel.getVisualEntity(visualEntity.visualSource);
      const target = visualModel.getVisualEntity(visualEntity.visualTarget);
      if (source === null || target === null) {
        invalidEntities.push(visualEntity.identifier);
        continue;
      }
      else if (isVisualNode(source) && isVisualNode(target)) {
        const semanticSource = classesContext.classProfiles
          .find(classProfile => classProfile.id === source.representedEntity);

        if(semanticSource === undefined) {
          invalidEntities.push(visualEntity.identifier);
          continue;
        }

        const isSemanticTargetPresent = semanticSource.profiling.includes(target.representedEntity)
        if(!isSemanticTargetPresent) {
          invalidEntities.push(visualEntity.identifier);
          continue;
        }

        addToRecordArray(visualEntity.visualTarget, visualEntity, validVisualProfileRelationships);
      }
    }
    else if (isVisualNode(visualEntity)) {
      const classProfile = classesContext.classProfiles
        .find(classProfile => classProfile.id === visualEntity.representedEntity);
      if (classProfile === undefined) {
        continue;
      }
      classProfilesInVisualModel[visualEntity.identifier] = {
        visualEntity,
        classProfile
      };
    }
  }

  // Find the missing ones
  for (const { visualEntity, classProfile } of Object.values(classProfilesInVisualModel)) {
    for (const profileOf of classProfile.profiling) {
      const profileOfVisuals = visualModel.getVisualEntitiesForRepresented(profileOf);
      for (const profileOfVisual of profileOfVisuals) {
        const isVisualProfileRelationshipInModel = validVisualProfileRelationships[profileOfVisual.identifier]
          ?.find(profileRelationship => profileRelationship.visualSource === visualEntity.identifier) !== undefined;
        if (!isVisualProfileRelationshipInModel) {
          const model = findSourceModelOfEntity(classProfile.id, models);
          if (model === null) {
            LOG.error("Missing the source model when creating missing profile relationship on validation");
            continue;
          }
          const profileRelationshipToAdd: Omit<VisualProfileRelationship, "identifier" | "type"> = {
            entity: classProfile.id,
            model: model.getId(),
            waypoints: [],
            visualSource: visualEntity.identifier,
            visualTarget: profileOfVisual.identifier
          }
          missingVisualProfileRelationships.push(profileRelationshipToAdd);
        }
      }
    }
  }

  if(invalidEntities.length > 0) {
    actions.removeFromVisualModelByVisual(invalidEntities);
  }
  for (const missingVisualProfileRelationship of missingVisualProfileRelationships) {
    visualModel.addVisualProfileRelationship(missingVisualProfileRelationship);
  }
}

/**
 * Removes the visual relationship profiles going from/to diagram node and validates relationships
 * inside model, where one can (but doesn't have to) be visual diagram node.
 */
function validateVisualModelAgainstDiagramNodes(
  actions: ActionsContextType,
  visualModel: VisualModel,
  visualModels: VisualModel[],
  allClasses: string[],
  relationships: (SemanticModelRelationship | SemanticModelGeneralization | SemanticModelRelationshipProfile)[],
) {
  // The algorithm idea isn't that complicated
  // We just go through all the
  // visual relationships in visual model and check the semantic ends of them and remove the edge,
  // if at least on the ends is missing.
  // For actual visual relationships this is simple.
  // For visual Profile relationships it is not,
  // so I just removed the attempt and by default we don't show class profile edges between diagram nodes!
  // ... so this next part of comment is invalid, but it still may contain some relevant info
  // The reason why it is not that simple is that:
  // The entity property on visual profile edge is no longer enough to identify
  // the original semantic profile source and target, since unlike in usages it is no longer 1:1 mapping.
  // So we do it in a bit more convoluted way.
  // The convoluted way is basically that we have to create bunch of maps and compute number
  // of profiles classes, which are supposed to be in each visual diagram node for each visual source.
  // and if we are not equal, we remove the excessive edges.

  const getByRepresentedWrapper = createGetVisualEntitiesForRepresentedGlobalWrapper(
    visualModels, visualModel);
  const visualModelsGetByRepresentedGlobal: Record<string, VisualsForRepresentedWrapper> = {
    [visualModel.getIdentifier()]: getByRepresentedWrapper,
  };

  const invalidEntities: string[] = [];
  for (const [_id, visualEntity] of visualModel.getVisualEntities()) {
    if(isVisualRelationship(visualEntity)) {
      const represented = relationships.find(relationship => relationship.id === visualEntity.representedRelationship);
      if (represented === undefined) {
        // Should not happen, but better be safe
        console.error("Can't find represented relationship when validating, this probably should not happen");
        invalidEntities.push(visualEntity.identifier);
        continue;
      }

      const { source, target } = getSemanticConnectionEndConcepts(represented);

      // The end is missing
      if (source === null || !allClasses.includes(source) || target === null || !allClasses.includes(target)) {
        invalidEntities.push(visualEntity.identifier);
        continue;
      }
      // Check if the visual end is the same as the semantic one
      const visualEdgeSource = visualModel.getVisualEntity(visualEntity.visualSource);
      const visualEdgeTarget = visualModel.getVisualEntity(visualEntity.visualTarget);
      if (visualEdgeSource === null || visualEdgeTarget === null) {
        invalidEntities.push(visualEntity.identifier);
        continue;
      }

      const isDomainValid = checkEdgeEndValidityAndExtend(
        visualModelsGetByRepresentedGlobal, visualModels,
        visualEdgeSource, source, visualEntity.identifier, invalidEntities);
      if (!isDomainValid) {
        continue;
      }

      const isRangeValid = checkEdgeEndValidityAndExtend(
        visualModelsGetByRepresentedGlobal, visualModels,
        visualEdgeTarget, target, visualEntity.identifier, invalidEntities);
      if (!isRangeValid) {
        continue;
      }
    }
    else if (isVisualProfileRelationship(visualEntity)) {
      // Previously we were trying to ALWAYS create visual profile relationships, now we just remove all of them.
      // Meaning all going from/to visual diagram node. We did that because:
      //  1) It did not work properly for some cases
      //  2) The class profile edges pointing from/to visual diagram node don't add much relevant information
      //     + They can not be removed from visual model, so it just introduces clutter
      const isSourceInvalid = validateVisualProfileRelationshipEnd(
        visualModel, visualEntity.visualSource, visualEntity.identifier, invalidEntities);
      if (isSourceInvalid) {
        continue;
      }
      validateVisualProfileRelationshipEnd(
        visualModel, visualEntity.visualTarget, visualEntity.identifier, invalidEntities);
    }
  }

  if(invalidEntities.length > 0) {
    actions.removeFromVisualModelByVisual(invalidEntities);
  }
}

/**
 * @returns Returns true if the end is not in visual model or it is visual diagram node.
 *  Also in such case the {@link invalidEntitiesToExtend} are extended
 */
function validateVisualProfileRelationshipEnd(
  visualModel: VisualModel,
  visualEndIdentifier: string,
  VisualProfileRelationship: string,
  invalidEntitiesToExtend: string[],
): boolean {
  const visualEnd = visualModel.getVisualEntity(visualEndIdentifier);
  if (visualEnd === null || isVisualDiagramNode(visualEnd)) {
    invalidEntitiesToExtend.push(VisualProfileRelationship);
    return true;
  }

  return false;
}

/**
 * Extends {@link invalidEntitiesToExtend} if necessary.
 * @returns returns true if everything is in order, false if there was at least one invalid entity
 *  (Either only the edge or the edge together with the end).
 */
function checkEdgeEndValidityAndExtend(
  visualModelToContentMappings: Record<string, VisualsForRepresentedWrapper>,
  visualModels: VisualModel[],
  visualEdgeEnd: VisualEntity,
  supposedSemanticEdgeEnd: string,
  examinedEdge: string,
  invalidEntitiesToExtend: string[]
): boolean {
  let isValid: boolean | null = true;

  if (isVisualDiagramNode(visualEdgeEnd)) {
    const isDiagramNodeValid = extendMappingsByDiagramNodeModelIfNotSet(
      visualModelToContentMappings, visualEdgeEnd, visualModels);
    if (!isDiagramNodeValid) {
      isValid = null;
    }
    else if(visualModelToContentMappings[visualEdgeEnd.representedVisualModel](supposedSemanticEdgeEnd).length === 0) {
      isValid = false;
    }
  }
  else if(isVisualNode(visualEdgeEnd)) {
    if(visualEdgeEnd.representedEntity !== supposedSemanticEdgeEnd) {
      isValid = false;
    }
  }
  else {
    LOG.error("Edge end is not diagram node neither visual node");
    isValid = null;
  }

  if(isValid === null) {
    invalidEntitiesToExtend.push(examinedEdge);
    invalidEntitiesToExtend.push(visualEdgeEnd.identifier);
  }
  else if(!isValid) {
    invalidEntitiesToExtend.push(examinedEdge);
  }

  return isValid ?? false;
}

/**
 * @returns Returns true if everything was in order, false if error occurred
 */
function extendMappingsByDiagramNodeModelIfNotSet(
  visualModelToContentMappings: Record<string, VisualsForRepresentedWrapper>,
  visualEdgeEndPoint: VisualDiagramNode,
  visualModels: VisualModel[],
): boolean {
  const representedVisualModel = visualModels
    .find(visualModel => visualModel.getIdentifier() === visualEdgeEndPoint.representedVisualModel);
  if (representedVisualModel === undefined) {
    return false;
  }
  if (visualModelToContentMappings[visualEdgeEndPoint.representedVisualModel] === undefined) {
    const getByRepresentedWrapper = createGetVisualEntitiesForRepresentedGlobalWrapper(
      visualModels, representedVisualModel);
    visualModelToContentMappings[visualEdgeEndPoint.representedVisualModel] = getByRepresentedWrapper;
  }

  return true;
}