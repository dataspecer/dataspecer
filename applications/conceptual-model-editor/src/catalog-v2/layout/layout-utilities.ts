import { UiEntity, UiGeneralization, UiSemanticModel } from "../ui-model";
import { EntityNode, TreeNode } from "../catalog-state";

/**
 * @returns Only items from given model.
 */
export function filterByModel<Type extends { model: UiSemanticModel }>(
  items: Type[], model: UiSemanticModel,
): Type[] {
  return items.filter(item => item.model.identifier === model.identifier);
}

/**
 * For children of given identifier host all represented entities.
 */
export type NodeChildren = Record<string, EntityNode[]>;

type ProfilingNode = EntityNode & { value: { profiling: { identifier: string }[] } };

/**
 * Add profiles to children list.
 */
export function addProfilesToChildren<UiType, NodeType extends ProfilingNode>(
  children: NodeChildren,
  profiles: UiType[],
  adapter: (value: UiType) => NodeType,
): void {
  profiles
    .map(item => adapter(item))
    .forEach(item => item.value.profiling.forEach(({ identifier }) => {
      if (children[identifier] === undefined) {
        children[identifier] = [];
      } else if (isAlreadyInList(item.identifier, children[identifier])) {
        return;
      }
      children[identifier].push(item);
    }));
}

function isAlreadyInList(identifier: string, items: EntityNode[]): boolean {
  return items.find(item => item.identifier === identifier) !== undefined;
}

/**
 * Add generalizations to children list.
 */
export function addGeneralizationsToChildren(
  children: NodeChildren,
  generalizations: UiGeneralization[],
  adapter: (value: UiEntity) => EntityNode | null,
): void {
  generalizations.forEach(item => {
    const child = adapter(item.child);
    if (child === null) {
      return;
    }
    const identifier = item.parent.identifier;
    if (children[identifier] === undefined) {
      children[identifier] = [];
    } else if (isAlreadyInList(child.identifier, children[identifier])) {
      return;
    }
    children[identifier].push(child);
  });
}

/**
 * Update given node by attaching, recursively, all related profiles.
 * @returns Original instance of entity node, just for better chaining.
 */
export function addChildrenToNode(
  profilesMap: NodeChildren,
  node: EntityNode,
  visited: string[],
): EntityNode {
  const nextVisited = [...visited, node.identifier];
  // Create copy of profiles.
  const profiles: TreeNode[] = [];
  for (const item of (profilesMap[node.identifier] ?? [])) {
    if (visited.includes(item.identifier)) {
      // We already saw this, breaking the cycle.
      continue;
    }
    const profile = { ...item };
    addChildrenToNode(profilesMap, profile, nextVisited);
    profiles.push(profile);
  }
  node.items = profiles;
  return node;
}
