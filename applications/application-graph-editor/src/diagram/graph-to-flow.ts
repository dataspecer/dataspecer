import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { EdgeType, type ApplicationGraph, type ApplicationNode } from "@dataspecer/app-generator/graph";
import type { NodePositions } from "../store.ts";
import type { FlaggedIds, ViolationLevel } from "../validation/violations.ts";
import { parallelEdgeOffsets } from "./edge-geometry.ts";

export type OperationFlowNode = Node<
  { node: ApplicationNode; violation: ViolationLevel | null },
  "operation"
>;

const VIOLATION_STROKE: Record<ViolationLevel, string> = {
  error: "#dc2626",
  warning: "#d97706",
};

/**
 * Projects the application graph onto React Flow nodes and edges.
 */
export function graphToFlow(
  graph: ApplicationGraph,
  positions: NodePositions,
  flagged: FlaggedIds,
): { nodes: OperationFlowNode[]; edges: Edge[] } {
  const nodes: OperationFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "operation",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { node, violation: flagged.nodes.get(node.id) ?? null },
  }));

  const offsets = parallelEdgeOffsets(graph.edges);
  const edges: Edge[] = graph.edges.map((edge) => {
    const isRedirect = edge.type === EdgeType.Redirect;
    const violation = flagged.edges.get(edge.id);
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
        ...(violation ? { color: VIOLATION_STROKE[violation] } : {}),
      },
      // redirects are dashed, transitions solid
      style: {
        ...(isRedirect ? { strokeDasharray: "6 4" } : {}),
        ...(violation ? { stroke: VIOLATION_STROKE[violation] } : {}),
      },
    };
  });

  return { nodes, edges };
}
