import {
  VisualNode,
  WritableVisualModel,
  isVisualNode,
} from "@dataspecer/core-v2/visual-model";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ClassesContextType } from "../context/classes-context";
import {
  SemanticModelRelationship,
  SemanticModelRelationshipEnd
} from "@dataspecer/core-v2/semantic-model/concepts";
import { DomainAndRange, getDomainAndRange } from "../util/relationship-utils";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

// I chose to process attributes separately instead of using the removeFromVisualModelAction.
// It needs additional arguments to the method and the attributes are in a way kind of
// separate and are removed only explicitly not in cascade.
// But maybe it is not ideal (RadStr)

/**
 * Remove attributes from visual model. That is after this action not a single node will include any of
 * the attributes listed in {@link attributeIdentifiers}.
 */
export function removeAttributesFromVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  visualModel: WritableVisualModel,
  attributeIdentifiers: string[],
) {

  const nodeToRemovedAttributesMap: Record<string, {node: VisualNode, attributesToRemove: string[]}> = {};
  for (const attributeIdentifier of attributeIdentifiers) {
    const domainAndRange = geDomainAndRangeForAttribute(classes, attributeIdentifier);
    if(domainAndRange === null) {
      continue;
    }
    addAttributesToRemoveToTheMap(
      notifications, visualModel, attributeIdentifier,
      domainAndRange, nodeToRemovedAttributesMap);
  }

  // Perform the delete operation of collected visual entities.
  Object.entries(nodeToRemovedAttributesMap).forEach(([nodeIdentifier, { node, attributesToRemove }]) => {
    const content = node.content.filter(attribute => !attributesToRemove.includes(attribute));
    visualModel.updateVisualEntity(nodeIdentifier, { content });
  });
}

function addAttributesToRemoveToTheMap(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  attributeIdentifier: string,
  domainAndRange: DomainAndRange<SemanticModelRelationshipEnd>,
  nodeToRemovedAttributesMap: Record<string, {
    node: VisualNode;
    attributesToRemove: string[];
  }>
) {
  const domainIdentifier = domainAndRange.domain?.concept ?? null;
  if(domainIdentifier === null) {
    notifications.error("Given attribute has invalid domain");
    return;
  }

  const nodes = visualModel.getVisualEntitiesForRepresented(domainIdentifier);
  for (const node of nodes) {
    if(!isVisualNode(node)) {
      notifications.error("Given attribute has something else than node as domain");
      return;
    }

    if(nodeToRemovedAttributesMap[node.identifier] === undefined) {
      nodeToRemovedAttributesMap[node.identifier] = {
        node,
        attributesToRemove: []
      };
    }
    nodeToRemovedAttributesMap[node.identifier].attributesToRemove.push(attributeIdentifier);
  }
}

function geDomainAndRangeForAttribute(
  classes: ClassesContextType, attributeIdentifier: string,
): DomainAndRange<SemanticModelRelationshipEnd> | null {
  const attribute: SemanticModelRelationship | SemanticModelRelationshipProfile | undefined =
      classes.relationships.find(relationship => relationship.id === attributeIdentifier);
  if (attribute === undefined) {
    return null;
  }
  return getDomainAndRange(attribute);
}
