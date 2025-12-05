import {
  isVisualRelationship,
  VisualModel,
  WritableVisualModel,
  VisualRelationship,
} from "@dataspecer/visual-model";
import { getVisualDiagramNodeMappingsByRepresented, isVisualEdgeEnd } from "./utilities";
import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ClassesContextType } from "@/context/classes-context";
import { findSourceModelOfEntity } from "@/service/model-service";
import { VisualModelDiagramNode } from "@/diagram";
import { createGetVisualEntitiesForRepresentedGlobalWrapper, VisualsForRepresentedWrapper } from "@/util/utils";
import { SemanticModelGeneralization, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getSemanticConnectionEndConcepts } from "@/util/relationship-utils";

/**
 * Adds all relatiions for the given {@link visualDiagramNode} to the given {@link visualModel}.
 */
export function addAllRelationshipsForVisualDiagramNodeToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  visualModelDiagramNode: VisualModelDiagramNode,
) {
  const allRelationships = [
    ...classesContext.generalizations,
    ...classesContext.relationships,
    ...classesContext.relationshipProfiles,
  ];

  const availableVisualModels: VisualModel[] = graph.aggregatorView.getAvailableVisualModels();

  const visualRelationshipsToAdd: Omit<VisualRelationship, "identifier" | "type">[] = [];

  const representedVisualModel = availableVisualModels
    .find(model => model.getIdentifier() === visualModelDiagramNode.externalIdentifier);
  if (representedVisualModel === undefined) {
    notifications.error("Missing referenced visual model");
    return;
  }
  const { classToVisualDiagramNodeMapping } = getVisualDiagramNodeMappingsByRepresented(
    availableVisualModels, visualModel);
  const getVisualEntitiesForRepresentedGlobal = createGetVisualEntitiesForRepresentedGlobalWrapper(
    availableVisualModels, visualModel);

  const classesStoredInDiagramNode: string[] = [];
  for (const [cclass, diagramNodeToCountMap] of Object.entries(classToVisualDiagramNodeMapping)) {
    if (diagramNodeToCountMap[visualModelDiagramNode.identifier] !== undefined) {
      classesStoredInDiagramNode.push(cclass);
    }
  }

  for (const cclass of classesStoredInDiagramNode) {
    // Go through all semantic relationships
    for (const relationship of allRelationships) {
      const { source, target } = getSemanticConnectionEndConcepts(relationship);

      // If domain is in the visual model diagram node
      if (source === cclass) {
        findRelationshipsForEnd(
          notifications, graph, visualModel, getVisualEntitiesForRepresentedGlobal,
          relationship, visualModelDiagramNode.identifier, target, false, visualRelationshipsToAdd);
      }
      if (target === cclass) {
        findRelationshipsForEnd(
          notifications, graph, visualModel, getVisualEntitiesForRepresentedGlobal,
          relationship, visualModelDiagramNode.identifier, source, true, visualRelationshipsToAdd);
      }
    }
  }

  // We don't need visual profile relationships actually, since currently we always show them when validating model
  for (const visualRelationshipToAdd of visualRelationshipsToAdd) {
    visualModel.addVisualRelationship(visualRelationshipToAdd)
  }

}

/**
 * End is either domain or range.
 * Extends {@link outputArray} the relationships which goes from the {@link end} (respectively {@link otherVisualEnd}),
 * where {@link otherVisualEnd} is the identifier of the visual diagram node.
 */
function findRelationshipsForEnd(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: VisualModel,
  getVisualEntitiesForRepresentedGlobal: VisualsForRepresentedWrapper,
  relationship: SemanticModelRelationship | SemanticModelRelationshipProfile | SemanticModelGeneralization,
  otherVisualEnd: string,
  end: string | null,
  isEndSource: boolean,
  outputArray: Omit<VisualRelationship, "identifier" | "type">[],
): void {
  const visualEndPropertyString = isEndSource ? "visualSource" : "visualTarget";
  const visualOtherEndPropertyString = isEndSource ? "visualTarget" : "visualSource";

  // If domain is in the visual model diagram node
  if (end === null) {
    return;
  }
  // Now just get all the visual representations for the represented relationship and use them to find visual ends,
  // which are already covered by the relationship
  const availableVisualEnds = getVisualEntitiesForRepresentedGlobal(end);
  const visualRelationships = visualModel.getVisualEntitiesForRepresented(relationship.id);
  const model = findSourceModelOfEntity(relationship.id, graph.models);
  if (model === null) {
    return;
  }

  for (const visualRelationship of visualRelationships) {
    if (!isVisualRelationship(visualRelationship)) {
      continue;
    }
    if (visualRelationship[visualOtherEndPropertyString] !== otherVisualEnd) {
      continue;
    }

    const index = availableVisualEnds
      .findIndex(possibleVisualEnd => possibleVisualEnd.identifier === visualRelationship[visualEndPropertyString])
    if(index === -1) {
      continue;
    }
    availableVisualEnds.splice(index, 1);
  }
  for (const availableVisualEnd of availableVisualEnds) {
    if (!isVisualEdgeEnd(availableVisualEnd)) {
      notifications.error("The edge end is not a supported edge end for unknown reason");
      continue;
    }
    if (otherVisualEnd === availableVisualEnd.identifier) {
      // Just skip it, what this would do is create self-loop which represents relationship
      // which exists inside the diagram node.
      continue;
    }

    let visualSource: string;
    let visualTarget: string;
    if (isEndSource) {
      visualSource = availableVisualEnd.identifier;
      visualTarget = otherVisualEnd;
    }
    else {
      visualSource = otherVisualEnd;
      visualTarget = availableVisualEnd.identifier;
    }

    const visualRelationship: Omit<VisualRelationship, "identifier" | "type"> = {
      representedRelationship: relationship.id,
      model: model?.getId(),
      waypoints: [],
      visualSource,
      visualTarget,
    }

    outputArray.push(visualRelationship);
  }
}