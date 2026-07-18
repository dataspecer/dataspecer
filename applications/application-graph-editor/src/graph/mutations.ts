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

/**
 * Derives a unique node id from the aggregate name and operation. When the id is generated for an
 * existing node, that node's current id is excluded from the collision check, so re-generating the
 * same base does not append a counter.
 */
export function nextNodeId(
  graph: ApplicationGraph,
  aggregateName: string,
  operation: Operation,
  excludeNodeId?: string,
): string {
  const base = `${kebabCase(deburr(aggregateName)) || "node"}.${OPERATION_SUFFIXES[operation]}`;
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

/** Renames a node and rewrites the edges referencing it. */
export function renameNode(
  graph: ApplicationGraph,
  currentId: string,
  newId: string,
): ApplicationGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === currentId ? { ...node, id: newId } : node)),
    edges: graph.edges.map((edge) => ({
      ...edge,
      source: edge.source === currentId ? newId : edge.source,
      target: edge.target === currentId ? newId : edge.target,
    })),
  };
}

/** Derives a unique edge id from its endpoints, for example "graphs.list-graphs.detail". */
export function nextEdgeId(graph: ApplicationGraph, source: string, target: string): string {
  const base = `${source}-${target}`;
  const used = new Set(graph.edges.map((edge) => edge.id));
  if (!used.has(base)) {
    return base;
  }
  let counter = 2;
  while (used.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
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
