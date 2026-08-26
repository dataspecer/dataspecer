import type { GraphElementRef } from './graph-element-ref.ts';

import { findNodeAtLocation, findNodeAtOffset, getNodePath, parseTree } from 'jsonc-parser';

/**
 * Resolves a text offset in serialized graph JSON to the node or edge whose section contains
 * it. The id comes from the JSON text itself, so the caller has to check it against the edited
 * graph before acting on it.
 */
export function graphElementAtOffset(text: string, offset: number): GraphElementRef {
  const tree = parseTree(text);
  if (!tree) {
    return null;
  }
  const leaf = findNodeAtOffset(tree, offset);
  if (!leaf) {
    return null;
  }

  const path = getNodePath(leaf);
  if ((path[0] !== 'nodes' && path[0] !== 'edges') || typeof path[1] !== 'number') {
    return null;
  }
  const idNode = findNodeAtLocation(tree, [path[0], path[1], 'id']);
  if (!idNode || typeof idNode.value !== 'string') {
    return null;
  }
  return { kind: path[0] === 'nodes' ? 'node' : 'edge', id: idNode.value };
}
