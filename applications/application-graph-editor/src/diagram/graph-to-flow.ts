import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { EdgeType, type ApplicationGraph, type ApplicationNode } from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";
import type { InvalidIds } from "../validation/violations.ts";
import { parallelEdgeOffsets } from "./edge-geometry.ts";

export type OperationFlowNode = Node<{ node: ApplicationNode; invalid: boolean }, "operation">;

const INVALID_STROKE = "#dc2626";

/**
 * Projects the application graph onto React Flow nodes and edges. Nodes and edges the current
 * violations point at are marked so the canvas can highlight them.
 */
export function graphToFlow(
  graph: ApplicationGraph,
  positions: NodePositions,
  invalid: InvalidIds,
): { nodes: OperationFlowNode[]; edges: Edge[] } {
  const nodes: OperationFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "operation",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { node, invalid: invalid.nodes.has(node.id) },
  }));

  const offsets = parallelEdgeOffsets(graph.edges);
  const edges: Edge[] = graph.edges.map((edge) => {
    const isRedirect = edge.type === EdgeType.Redirect;
    const isInvalid = invalid.edges.has(edge.id);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "floating",
      data: { offset: offsets[edge.id] },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        ...(isInvalid ? { color: INVALID_STROKE } : {}),
      },
      // redirects are dashed, transitions solid
      style: {
        ...(isRedirect ? { strokeDasharray: "6 4" } : {}),
        ...(isInvalid ? { stroke: INVALID_STROKE } : {}),
      },
    };
  });

  return { nodes, edges };
}
