import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { EdgeType, type ApplicationGraph, type ApplicationNode } from "@dataspecer/app-generator/graph";
import type { NodePositions, Selection } from "../store.ts";
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

const SELECTED_STROKE = "#3b82f6";


/**
 * Projects the application graph onto React Flow nodes and edges.
 */
export function graphToFlow(
  graph: ApplicationGraph,
  positions: NodePositions,
  flagged: FlaggedIds,
  selection: Selection,
): { nodes: OperationFlowNode[]; edges: Edge[] } {
  const nodes: OperationFlowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "operation",
    position: positions[node.id] ?? { x: 0, y: 0 },
    selected: selection?.kind === "node" && selection.id === node.id,
    data: { node, violation: flagged.nodes.get(node.id) ?? null },
  }));

  const offsets = parallelEdgeOffsets(graph.edges);
  const edges: Edge[] = graph.edges.map((edge) => {
    const isRedirect = edge.type === EdgeType.Redirect;
    const violation = flagged.edges.get(edge.id);
    const selected = selection?.kind === "edge" && selection.id === edge.id;
    const stroke = violation ? VIOLATION_STROKE[violation] : selected ? SELECTED_STROKE : undefined;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "floating",
      selected,
      data: { offset: offsets[edge.id] },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        ...(stroke ? { color: stroke } : {}),
      },
      // redirects are dashed, transitions solid
      style: {
        ...(isRedirect ? { strokeDasharray: "6 4" } : {}),
        ...(stroke ? { stroke } : {}),
        ...(selected ? { strokeWidth: 2.5 } : {}),
      },
    };
  });

  return { nodes, edges };
}
