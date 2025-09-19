import {
  CLASS_NODE_TYPE,
  CLASS_PROFILE_NODE_TYPE,
  ClassNode,
  ClassProfileNode,
  EntityNode,
  GENERALIZATION_NODE_TYPE,
  GeneralizationNode,
  isEntityNode,
  RELATIONSHIP_NODE_TYPE,
  RELATIONSHIP_PROFILE_NODE_TYPE,
  RelationshipNode,
  RelationshipProfileNode,
  SemanticModelNode,
  TreeNode,
} from "./catalog-state";
import {
  isUiGeneralization,
  isUiRelationship,
  isUiRelationshipProfile,
  UiClass,
  UiClassProfile,
  UiGeneralization,
  UiRelationship,
  UiRelationshipProfile,
  UiSemanticModel,
} from "../dataspecer/ui-model";
import { VisualModel } from "@dataspecer/visual-model";

export const uiSemanticModelToNode = (
  value: UiSemanticModel,
): SemanticModelNode => {
  return withDerived({
    type: "semantic-model",
    identifier: value.identifier,
    value: value,
    items: [],
    displayLabel: value.label,
    displayColor: value.color,
    path: [],
    collapsed: false,
    filter: true,
  });
}

const sortDeriveRegEx = /[\[\]]/gi;

const withDerived = <T extends {displayLabel: string}>(item: T) => ({
  ...item,
  filterText: item.displayLabel.toLocaleLowerCase(),
  sortText: item.displayLabel.replaceAll(sortDeriveRegEx, "")
});

export const uiClassToNode = (
  value: UiClass,
): ClassNode => {
  return withDerived({
    ...defaults(),
    type: CLASS_NODE_TYPE,
    identifier: value.identifier,
    value,
    displayLabel: value.label,
    displayColor: value.model.color,
    model: value.model.identifier,
  });
}

const defaults = () => ({
  items: [],
  canBeVisible: false,
  path: [],
  visualEntities: [],
  filter: true,
});

export const uiClassProfileToNode = (
  value: UiClassProfile,
): ClassProfileNode => {
  return withDerived({
    ...defaults(),
    type: CLASS_PROFILE_NODE_TYPE,
    identifier: value.identifier,
    value,
    displayLabel: value.label,
    displayColor: value.model.color,
    model: value.model.identifier,
  });
}

export const uiRelationshipToNode = (
  value: UiRelationship,
): RelationshipNode => {
  return withDerived({
    ...defaults(),
    type: RELATIONSHIP_NODE_TYPE,
    identifier: value.identifier,
    value,
    displayLabel: value.label,
    displayColor: value.model.color,
    model: value.model.identifier,
  });
}

export const uiRelationshipProfileToNode = (
  value: UiRelationshipProfile,
): RelationshipProfileNode => {
  return withDerived({
    ...defaults(),
    type: RELATIONSHIP_PROFILE_NODE_TYPE,
    identifier: value.identifier,
    value,
    displayLabel: `[${value.domain.label}] -> ${value.label}`,
    displayColor: value.model.color,
    model: value.model.identifier,
  });
}

export const uiGeneralizationToNode = (
  value: UiGeneralization,
): GeneralizationNode => {
  return withDerived({
    ...defaults(),
    type: GENERALIZATION_NODE_TYPE,
    identifier: value.identifier,
    value,
    displayLabel: value.label,
    displayColor: value.model.color,
    model: value.model.identifier,
  });
}

/**
 * Assign visual entities to all nodes.
 */
export const updateVisualEntities = (
  visualsModel: VisualModel | null,
  items: TreeNode[],
): TreeNode[] => {
  if (items.length === 0) {
    return items;
  }
  let hasChanged = false;
  const result = [...items];
  for (const [index, item] of items.entries()) {
    let nextItem = item;
    nextItem = updateNodeCanBeVisible(visualsModel, nextItem);
    nextItem = updateNodeVisualEntities(visualsModel, nextItem);
    nextItem = updateNodeItems(visualsModel, nextItem);
    // Check for a change of the item.
    if (nextItem === item) {
      continue;
    }
    hasChanged = true;
    result[index] = nextItem;
  }
  // If there was no change return original array.
  return hasChanged ? result : items;
}

const updateNodeVisualEntities = (
  visualsModel: VisualModel | null,
  node: TreeNode,
): TreeNode | EntityNode => {
  if (!isEntityNode(node)) {
    return node;
  }
  const nextVisualEntities = visualsModel === null ? []
    : visualsModel.getVisualEntitiesForRepresented(node.identifier)
      .map(item => item.identifier);
  if (compareArrays(nextVisualEntities, node.visualEntities)) {
    // There was no change.
    return node;
  }
  return {
    ...node,
    visualEntities: nextVisualEntities
  };
}

const updateNodeItems = (
  visualsModel: VisualModel | null,
  node: TreeNode,
): TreeNode => {
  const nextNested = updateVisualEntities(visualsModel, node.items);
  if (nextNested === node.items) {
    return node;
  } else {
    return {
      ...node,
      items: nextNested,
    };
  }
}

const updateNodeCanBeVisible = (
  visualsModel: VisualModel | null,
  node: TreeNode,
): TreeNode | EntityNode => {
  if (!isEntityNode(node)) {
    return node;
  }
  // Collect dependencies.
  const dependencies: string[] = [];
  if (isUiRelationship(node.value)) {
    dependencies.push(node.value.range.identifier);
    dependencies.push(node.value.domain.identifier);
  } else if (isUiRelationshipProfile(node.value)) {
    dependencies.push(node.value.range.identifier);
    dependencies.push(node.value.domain.identifier);
  } else if (isUiGeneralization(node.value)) {
    dependencies.push(node.value.parent.identifier);
    dependencies.push(node.value.child.identifier);
  }
  const nextCanBeVisible = dependencies.every(
    identifier => visualsModel?.hasVisualEntityForRepresented(identifier));
  if (node.canBeVisible === nextCanBeVisible) {
    return node;
  } else {
    return {
      ...node,
      canBeVisible: nextCanBeVisible,
    }
  }
}

const compareArrays = <T>(left: T[], right: T[]): boolean => {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  // Compare items.
  return left.every((element, index) => element === right[index]);
}

export const updatePath = (
  items: TreeNode[],
  // The initial is an empty array.
  path: number[] = [],
): TreeNode[] => {
  if (items.length === 0) {
    return items;
  }
  let hasChanged = false;
  const result = [...items];
  for (const [index, item] of items.entries()) {
    const nextPath = [...path, index];
    if (compareArrays(item.path, nextPath)) {
      continue;
    }
    result[index] = {
      ...item,
      path: nextPath,
      items: updatePath(item.items, nextPath),
    };
    hasChanged = true;
  }
  // If there was no change return original array.
  return hasChanged ? result : items;
}

export const updateItemsOrder = (
  items: TreeNode[],
): TreeNode[] => {
  return items.toSorted(
    (left, right) => left.sortText.localeCompare(right.sortText))
    .map(item => ({
      ...item,
      items: updateItemsOrder(item.items),
    }));
}