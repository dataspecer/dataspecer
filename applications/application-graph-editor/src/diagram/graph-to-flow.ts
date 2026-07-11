import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { EdgeType, type ApplicationGraph, type ApplicationNode } from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";

export type OperationFlowNode = Node<{ node: ApplicationNode }, "operation">;

/**
 * Projects the application graph onto React Flow nodes and edges.
 */
export function graphToFlow(
  graph: ApplicationGraph,
  positions: NodePositions,
): { nodes: OperationFlowNode[]; edges: Edge[] } {
  const nodes: OperationFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "operation",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { node },
  }));

  const edges: Edge[] = graph.edges.map((edge) => {
    const isRedirect = edge.type === EdgeType.Redirect;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      // redirects are dashed, transitions solid
      style: isRedirect ? { strokeDasharray: "6 4" } : undefined,
      label: isRedirect ? "redirect" : undefined,
    };
  });

  return { nodes, edges };
}
