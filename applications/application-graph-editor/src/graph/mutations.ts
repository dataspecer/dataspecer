import { deburr, kebabCase } from "es-toolkit";
import {
  Operation,
  type ApplicationEdge,
  type ApplicationGraph,
  type ApplicationNode,
} from "@dataspecer/app-generator/graph";

const OPERATION_SUFFIXES: Record<Operation, string> = {
  [Operation.Create]: "create",
  [Operation.ReadList]: "list",
  [Operation.ReadDetail]: "detail",
  [Operation.Update]: "update",
  [Operation.Delete]: "delete",
};

function nodeIdBase(aggregateName: string, operation: Operation): string {
  return `${kebabCase(deburr(aggregateName)) || "node"}.${OPERATION_SUFFIXES[operation]}`;
}

/**
 * Derives a unique node ID from the aggregate name and operation. When the ID is generated for an
 * existing node, that node's current ID is excluded from the collision check, so re-generating the
 * same base does not append a counter.
 */
export function nextNodeId(
  graph: ApplicationGraph,
  aggregateName: string,
  operation: Operation,
  excludeNodeId?: string,
): string {
  const base = nodeIdBase(aggregateName, operation);
  const used = new Set(
    graph.nodes.filter((node) => node.id !== excludeNodeId).map((node) => node.id),
  );
  if (!used.has(base)) {
    return base;
  }
  let counter = 2;
  while (used.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
}

/**
 * Whether the ID is the one the scheme would produce for this aggregate and operation, allowing
 * for the counter a collision adds. A hand written ID is left alone when the node changes.
 */
export function isGeneratedNodeId(
  id: string,
  aggregateName: string,
  operation: Operation,
): boolean {
  const base = nodeIdBase(aggregateName, operation);
  return (
    id === base || (id.startsWith(`${base}-`) && /^\d+$/.test(id.slice(base.length + 1)))
  );
}

/**
 * Renames a node and rewrites the edges referencing it. Edge IDs in the derived
 * "source-target" form follow the new endpoint names, manually overwritten edge IDs stay.
 */
export function renameNode(
  graph: ApplicationGraph,
  currentId: string,
  newId: string,
): ApplicationGraph {
  const rewritten = graph.edges.map((edge) => {
    const source = edge.source === currentId ? newId : edge.source;
    const target = edge.target === currentId ? newId : edge.target;
    const regenerateId = (source !== edge.source || target !== edge.target) && hasDerivedId(edge);
    return { edge: { ...edge, source, target }, regenerateId };
  });
  const used = new Set(rewritten.filter((entry) => !entry.regenerateId).map((entry) => entry.edge.id));
  const edges = rewritten.map(({ edge, regenerateId }) => {
    if (!regenerateId) {
      return edge;
    }
    const id = uniqueEdgeId(used, edge.source, edge.target);
    used.add(id);
    return { ...edge, id };
  });

  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === currentId ? { ...node, id: newId } : node)),
    edges,
  };
}

function hasDerivedId(edge: ApplicationEdge): boolean {
  const base = `${edge.source}-${edge.target}`;
  return (
    edge.id === base ||
    (edge.id.startsWith(`${base}-`) && /^\d+$/.test(edge.id.slice(base.length + 1)))
  );
}

function uniqueEdgeId(used: ReadonlySet<string>, source: string, target: string): string {
  const base = `${source}-${target}`;
  if (!used.has(base)) {
    return base;
  }
  let counter = 2;
  while (used.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
}

/** Derives a unique edge ID from its endpoints, for example "graphs.list-graphs.detail". */
export function nextEdgeId(graph: ApplicationGraph, source: string, target: string): string {
  return uniqueEdgeId(new Set(graph.edges.map((edge) => edge.id)), source, target);
}

export function addNode(graph: ApplicationGraph, node: ApplicationNode): ApplicationGraph {
  return { ...graph, nodes: [...graph.nodes, node] };
}

/** Removes a node together with the edges referencing it, so the graph keeps no dangling edges. */
export function removeNode(graph: ApplicationGraph, nodeId: string): ApplicationGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  };
}

export function updateNode(
  graph: ApplicationGraph,
  nodeId: string,
  patch: Partial<Omit<ApplicationNode, "id">>,
): ApplicationGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
  };
}

export function addEdge(graph: ApplicationGraph, edge: ApplicationEdge): ApplicationGraph {
  return { ...graph, edges: [...graph.edges, edge] };
}

export function updateEdge(
  graph: ApplicationGraph,
  edgeId: string,
  patch: Partial<Omit<ApplicationEdge, "id">>,
): ApplicationGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
  };
}

export function removeEdge(graph: ApplicationGraph, edgeId: string): ApplicationGraph {
  return { ...graph, edges: graph.edges.filter((edge) => edge.id !== edgeId) };
}
