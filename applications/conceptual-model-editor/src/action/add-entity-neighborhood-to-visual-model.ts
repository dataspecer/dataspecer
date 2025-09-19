import { isVisualNode, isVisualRelationship, WritableVisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { EntityToAddToVisualModel } from "./add-semantic-entities-to-visual-model";
import { ExtensionType, NodeSelection, VisibilityFilter, extendSelectionAction } from "./extend-selection-action";
import {
  isSemanticModelAttribute,
  isSemanticModelRelationship,
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "@/dataspecer/semantic-model";
import {
  getDomainAndRange,
  getDomainAndRangeConcepts,
  getSemanticConnectionEndConcepts
} from "@/util/relationship-utils";
import { addSemanticClassToVisualModelAction } from "./add-class-to-visual-model";
import { findSourceModelOfEntity } from "@/service/model-service";
import { addSemanticClassProfileToVisualModelAction } from "./add-class-profile-to-visual-model";
import { findPositionForNewNodesUsingLayouting, findPositionForNewNodeUsingLayouting } from "./layout-visual-model";
import { getVisualNodeContentBasedOnExistingEntities } from "./utilities";
import { XY } from "@dataspecer/layout";
import { addSemanticAttributeToVisualNodeAction } from "./add-semantic-attribute-to-visual-node";
import { getViewportCenterForClassPlacement } from "./utilities";
import { EntityModel } from "@dataspecer/core-v2";

/**
 * Adds entity's neighborhood to visual model. That is:
 * For classes it is classes connected to semantic class or class profile identified by {@link identifier}.
 * For relationships that is both ends and the relationship.
 * For attributes it adds the domain class to canvas.
 */
export const addEntityNeighborhoodToVisualModelAction = async (
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifier: string
): Promise<void> => {
  const allClasses = (classes.classes as (SemanticModelClass | SemanticModelClassProfile)[])
    .concat(classes.classProfiles);
  const allRelationships = [
    ...classes.relationships,
    ...classes.relationshipProfiles
  ];

  const isClassOrClassProfile = allClasses.findIndex(cclass => cclass.id === identifier) >= 0;
  if (isClassOrClassProfile) {
    return addClassNeighborhoodToVisualModelAction(notifications, classes, graph, diagram, visualModel, identifier);
  }
  else {
    const possibleRelationship = allRelationships.find(relationship => relationship.id === identifier);
    if (possibleRelationship === undefined) {
      notifications.error("The given entity to find neighborhood for is of unknown type");
      return;
    }

    if (isSemanticModelAttribute(possibleRelationship)) {
      const { domain } = getDomainAndRange(possibleRelationship);
      if (domain === null || domain.concept === null) {
        notifications.error("Given entity is attribute, but it does not have domain class");
        return;
      }

      // Try to add the domain node
      await addClassOrClassProfileToVisualModel(
        notifications, classes, graph, diagram, visualModel,
        domain.concept, null, false, [identifier]);

      // Add attribute to all existing domain nodes
      for (const domainNode of visualModel.getVisualEntitiesForRepresented(domain.concept)) {
        if (!isVisualNode(domainNode)) {
          notifications.error("Domain node of attribute is not a node");
          return;
        }

        addSemanticAttributeToVisualNodeAction(
          notifications, visualModel, domainNode, identifier, null, false);
      }

    }
    else if (isSemanticModelAttributeProfile(possibleRelationship)) {
      const { domain } = getDomainAndRange(possibleRelationship);
      if (domain === null || domain.concept === null) {
        notifications.error("Given entity is attribute profile, but it does not have domain class");
        return;
      }

      // Try to add the domain node
      addClassOrClassProfileToVisualModel(
        notifications, classes, graph, diagram, visualModel,
        domain.concept, null, false, [identifier]);

      // Add attribute to all existing domain nodes
      for (const domainNode of visualModel.getVisualEntitiesForRepresented(domain.concept)) {
        if (!isVisualNode(domainNode)) {
          notifications.error("Domain node of attribute is not a node");
          return;
        }

        addSemanticAttributeToVisualNodeAction(
          notifications, visualModel, domainNode, identifier, null, false);
      }
    }
    else if (isSemanticModelRelationship(possibleRelationship) ||
      isSemanticModelRelationshipProfile(possibleRelationship)) {
      const { domain, range } = getDomainAndRangeConcepts(possibleRelationship);
      if (domain === null) {
        notifications.error("Given entity is relationship or relationship profile, but it does not have domain class");
        return;
      }
      if (range === null) {
        notifications.error("Given entity is relationship or relationship profile, but it does not have range class");
        return;
      }

      const positions = await findPositionForNewNodesUsingLayouting(
        notifications, diagram, graph, visualModel, classes, [domain, range]);

      if (!visualModel.hasVisualEntityForRepresented(domain)) {
        const isDomainAdded = await addClassOrClassProfileToVisualModel(
          notifications, classes, graph, diagram, visualModel,
          domain, positions[domain], false, []);
        if (!isDomainAdded) {
          return;
        }
      }

      if (!visualModel.hasVisualEntityForRepresented(range)) {
        const isRangeAdded = await addClassOrClassProfileToVisualModel(
          notifications, classes, graph, diagram, visualModel,
          range, positions[range], false, []);
        if (!isRangeAdded) {
          return;
        }
      }

      const allConnections = [
        ...classes.generalizations,
        ...classes.relationships,
        ...classes.relationshipProfiles
      ];
      addSemanticConnectionBetweenAllValidVisualNodes(
        notifications, allConnections, graph.models, visualModel, identifier);
    }
  }
}

function addSemanticClassOrClassProfileToVisualModelCommand(
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  entity: SemanticModelClass | SemanticModelClassProfile,
  model: string,
  position: { x: number, y: number },
  content: string[] | null
): string {
  const nodeContent = content ?? getVisualNodeContentBasedOnExistingEntities(
    classes, entity);
  const createdNodeIdentifier = visualModel.addVisualNode({
    model,
    representedEntity: entity.id,
    position: {
      x: position.x,
      y: position.y,
      anchored: null,
    },
    content: nodeContent,
    visualModels: [],
  });

  const inputForExtension: NodeSelection = {
    identifiers: [entity.id],
    areIdentifiersFromVisualModel: false
  };
  const classProfileChildren = extendSelectionAction(
    notifications, graph, classes, inputForExtension,
    [ExtensionType.ClassProfileChild],
    VisibilityFilter.All, null);

  const classProfileParents = extendSelectionAction(
    notifications, graph, classes, inputForExtension,
    [ExtensionType.ClassProfileParent],
    VisibilityFilter.All, null);

  for (const classProfileChild of classProfileChildren.selectionExtension.nodeSelection) {
    const modelForVisualProfileRelationship = findSourceModelOfEntity(classProfileChild, graph.models);
    if (modelForVisualProfileRelationship === null) {
      notifications.error("The related class profile has no source model");
      continue;
    }

    for (const visualClassProfileChild of visualModel.getVisualEntitiesForRepresented(classProfileChild)) {
      visualModel.addVisualProfileRelationship({
        model: modelForVisualProfileRelationship.getId(),
        entity: classProfileChild,
        waypoints: [],
        visualSource: visualClassProfileChild.identifier,
        visualTarget: createdNodeIdentifier
      })
    }
  }

  for (const classProfileParent of classProfileParents.selectionExtension.nodeSelection) {
    for (const visualClassProfileParent of visualModel.getVisualEntitiesForRepresented(classProfileParent)) {
      visualModel.addVisualProfileRelationship({
        model,
        entity: entity.id,
        waypoints: [],
        visualSource: createdNodeIdentifier,
        visualTarget: visualClassProfileParent.identifier
      })
    }
  }

  return createdNodeIdentifier;
}

/**
 * Checks if given given {@link identifier} is class or class profile and if so, it is added to visual model.
 * @param shouldAddRelatedEntities if true, then related entities like edges to existing nodes are added.
 * If false just the node is added and nothing else.
 * @returns true if the class or class profile was added. False if failure occurred.
 */
const addClassOrClassProfileToVisualModel = async (
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifier: string,
  position: XY | null,
  shouldAddRelatedEntities: boolean,
  nodeContent: string[] | null,
): Promise<boolean> => {
  if (visualModel.hasVisualEntityForRepresented(identifier)) {
    return true;
  }

  const cclass = classes.classes.find(cclass => cclass.id === identifier);
  if (cclass === undefined) {
    const classProfile = classes.classProfiles.find(classProfile => classProfile.id === identifier);

    if (classProfile === undefined) {
      notifications.error("Related entity is neither class or class profile");
      return false;
    }

    const model = findSourceModelOfEntity(classProfile.id, graph.models);
    if (model === null) {
      notifications.error("Related entity is class or class profile, but has missing source model");
      return false;
    }

    if (shouldAddRelatedEntities) {
      addSemanticClassProfileToVisualModelAction(
        notifications, graph, classes, visualModel, diagram,
        identifier, model?.getId(), position);
    }
    else {
      const exactPosition = position ?? await findPositionForNewNodeUsingLayouting(
        notifications, diagram, graph, visualModel, classes, identifier);
      await addSemanticClassOrClassProfileToVisualModelCommand(
        notifications, classes, graph, visualModel, classProfile,
        model.getId(), exactPosition, nodeContent);
    }
    return true;
  }

  const model = findSourceModelOfEntity(cclass.id, graph.models);
  if (model === null) {
    notifications.error(
      "Given entity is relationship or relationship profile, but its domain or range has missing source model");
    return false;
  }

  if (shouldAddRelatedEntities) {
    addSemanticClassToVisualModelAction(
      notifications, graph, classes, visualModel, diagram, cclass.id, model.getId(), position);
  }
  else {
    const exactPosition = position ?? await findPositionForNewNodeUsingLayouting(
      notifications, diagram, graph, visualModel, classes, identifier);
    await addSemanticClassOrClassProfileToVisualModelCommand(
      notifications, classes, graph, visualModel, cclass,
      model.getId(), exactPosition, nodeContent);
  }

  return true;
}

const addClassNeighborhoodToVisualModelAction = async (
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  identifier: string
): Promise<void> => {
  const inputForExtension: NodeSelection = {
    identifiers: [identifier],
    areIdentifiersFromVisualModel: false
  };
  const neighborhood = extendSelectionAction(
    notifications, graph, classes, inputForExtension,
    [ExtensionType.Association, ExtensionType.Generalization,
      ExtensionType.ClassProfile, ExtensionType.ProfileEdge],
    VisibilityFilter.All, null);

  const viewportCenter = getViewportCenterForClassPlacement(diagram);

  const classesOrClassProfilesToAdd: EntityToAddToVisualModel[] = [
    {
      identifier,
      position: { ...viewportCenter }
    }
  ];

  // We have to filter the source class, whose neighborhood we are adding, from the extension.
  // Because we don't want to have duplicate there.
  classesOrClassProfilesToAdd.push(
    ...neighborhood.selectionExtension.nodeSelection
      .filter(node => node !== identifier)
      .map(node => ({
        identifier: node,
        position: { ...viewportCenter }
      }))
  );

  const neighborhoodClassesIdentifiers = classesOrClassProfilesToAdd
    .map(cclass => cclass.identifier);
  const positions = await findPositionForNewNodesUsingLayouting(
    notifications, diagram, graph, visualModel, classes, neighborhoodClassesIdentifiers);
  for (const classOrClassProfileToAdd of classesOrClassProfilesToAdd) {
    classOrClassProfileToAdd.position = positions[classOrClassProfileToAdd.identifier];
  }

  for (const classOrClassProfileToAdd of classesOrClassProfilesToAdd) {
    const position = classOrClassProfileToAdd.position ?? { ...viewportCenter };

    let nodeContent: string[] = [];
    if (identifier === classOrClassProfileToAdd.identifier) {
      nodeContent = getAllAttributesForDomainClass(classes, identifier);
    }

    await addClassOrClassProfileToVisualModel(
      notifications, classes, graph, diagram, visualModel,
      classOrClassProfileToAdd.identifier, position, false, nodeContent);
  }

  const allNeighborhoodSemanticEdges = neighborhood.selectionExtension.edgeSelection
    .map(semanticEdge => ({ identifier: semanticEdge, position: null }));

  const allConnections = [
    ...classes.generalizations,
    ...classes.relationships,
    ...classes.relationshipProfiles
  ];

  for (const neighborhoodSemanticEdge of allNeighborhoodSemanticEdges) {
    addSemanticConnectionBetweenAllValidVisualNodes(
      notifications, allConnections, graph.models, visualModel, neighborhoodSemanticEdge.identifier);
  }
};

function getAllAttributesForDomainClass(
  classesContext: ClassesContextType,
  domainClass: string
) {
  const attributes = classesContext.relationships.filter(isSemanticModelAttribute);
  const attributeProfiles = classesContext.relationshipProfiles.filter(isSemanticModelAttributeProfile);

  const allAttributes = ([] as (SemanticModelRelationship | SemanticModelRelationshipProfile )[])
    .concat(attributes).concat(attributeProfiles);

  return allAttributes
    .filter(attribute => getDomainAndRangeConcepts(attribute).domain === domainClass)
    .map(attribute => attribute.id);
}

function addSemanticConnectionBetweenAllValidVisualNodes(
  notifications: UseNotificationServiceWriterType,
  allConnections: (SemanticModelRelationship | SemanticModelRelationshipProfile | SemanticModelGeneralization)[],
  models: Map<string, EntityModel>,
  visualModel: WritableVisualModel,
  connectionIdentifier: string,
) {
  const connection = allConnections.find(relationship => relationship.id === connectionIdentifier);
  if (connection === undefined) {
    notifications.error("Can't find related relationhip in the list of all semantic relationships.");
    return;
  }

  const model = findSourceModelOfEntity(connection.id, models);
  if (model === null) {
    notifications.error("Missing source model for related relationship");
    return;
  }

  const { source, target } = getSemanticConnectionEndConcepts(connection);
  if (source === null || target === null) {
    notifications.error("Invalid relationship entity.");
    console.error("Ignored relationship as ends are null.", { source, target, relationship: connection });
    return;
  }

  const visualSources = visualModel.getVisualEntitiesForRepresented(source);
  const visualTargets = visualModel.getVisualEntitiesForRepresented(target);
  if (visualSources.length === 0 || visualTargets.length === 0) {
    return;
  }

  const existingVisualRelationships = visualModel.getVisualEntitiesForRepresented(connection.id)
    .filter(isVisualRelationship);

  for (const visualSource of visualSources) {
    for (const visualTarget of visualTargets) {
      const isVisualRelationshipAlreadyPresent = existingVisualRelationships
        .find(visualRelationship =>
          visualRelationship.visualSource === visualSource.identifier &&
          visualRelationship.visualTarget === visualTarget.identifier) !== undefined;
      if (isVisualRelationshipAlreadyPresent) {
        continue;
      }

      visualModel.addVisualRelationship({
        representedRelationship: connection.id,
        model: model.getId(),
        waypoints: [],
        visualSource: visualSource.identifier,
        visualTarget: visualTarget.identifier
      });
    }
  }

}
