import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { isEqual } from "es-toolkit";
import { EdgeType, type ApplicationGraph, type ApplicationNode } from "@dataspecer/app-generator/graph";
import type { NodePositions, Selection } from "../store.ts";
import type { FlaggedIds, ViolationLevel } from "../validation/violations.ts";
import { parallelEdgeOffsets } from "./edge-geometry.ts";

export type OperationFlowNode = Node<
  { node: ApplicationNode; violation: ViolationLevel | null; highlighted: boolean },
  "operation"
>;

const VIOLATION_STROKE: Record<ViolationLevel, string> = {
  error: "#dc2626",
  warning: "#d97706",
};

const SELECTED_STROKE = "#3b82f6";

const EMPHASIZED_STROKE_WIDTH = 2.5;

const REDIRECT_DASH = "6 4";

function byId<Element extends { id: string }>(elements: Element[]): Map<string, Element> {
  return new Map(elements.map((element) => [element.id, element]));
}

/**
 * Keeps the object React Flow already has when the freshly built one holds the same values. React
 * Flow stores the size it measured on the object it was given, so handing it an equivalent copy
 * makes it measure the node again, and a node without a size gives its edges no endpoints, which
 * unmounts the whole edge layer for a frame. Only the keys of the built object are compared, the
 * ones React Flow adds on its own are left alone.
 */
function reuse<Element extends object>(previous: Element | undefined, built: Element): Element {
  if (previous === undefined) {
    return built;
  }
  const before = previous as Record<string, unknown>;
  const after = built as Record<string, unknown>;
  return Object.keys(after).every((key) => isEqual(after[key], before[key])) ? previous : built;
}

/** Projects the application graph nodes onto the React Flow nodes. */
export function projectNodes(
  graph: ApplicationGraph,
  positions: NodePositions,
  flagged: FlaggedIds,
  highlight: Selection,
  current: OperationFlowNode[],
): OperationFlowNode[] {
  const previous = byId(current);
  return graph.nodes.map((node) => {
    const known = previous.get(node.id);
    return reuse(known, {
      id: node.id,
      type: "operation",
      position: positions[node.id] ?? { x: 0, y: 0 },
      selected: known?.selected,
      // the measured size still holds while the node keeps its shape, and keeping it stops the
      // node from being hidden until React Flow measures it again
      measured: known?.measured,
      data: {
        node,
        violation: flagged.nodes.get(node.id) ?? null,
        highlighted: highlight?.kind === "node" && highlight.id === node.id,
      },
    });
  });
}

/** IDs of what the canvas has selected, which the edges are coloured by. */
export interface SelectedIds {
  nodes: ReadonlySet<string>;
  edges: ReadonlySet<string>;
}

/** Projects the application graph edges onto the React Flow edges. */
export function projectEdges(
  graph: ApplicationGraph,
  flagged: FlaggedIds,
  highlight: Selection,
  selected: SelectedIds,
  current: Edge[],
): Edge[] {
  const previous = byId(current);
  const offsets = parallelEdgeOffsets(graph.edges);
  return graph.edges.map((edge) => {
    const known = previous.get(edge.id);
    const isRedirect = edge.type === EdgeType.Redirect;
    const violation = flagged.edges.get(edge.id);
    // an edge counts as selected when one of its nodes is
    const emphasized =
      selected.edges.has(edge.id) ||
      selected.nodes.has(edge.source) ||
      selected.nodes.has(edge.target) ||
      (highlight?.kind === "edge" && highlight.id === edge.id);

    const stroke = emphasized
      ? SELECTED_STROKE
      : violation
        ? VIOLATION_STROKE[violation]
        : undefined;
    return reuse(known, {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "floating",
      selected: known?.selected,
      data: { offset: offsets[edge.id] },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        ...(stroke ? { color: stroke } : {}),
      },
      // redirects are dashed, transitions solid
      style: {
        ...(isRedirect ? { strokeDasharray: REDIRECT_DASH } : {}),
        ...(stroke ? { stroke } : {}),
        ...(emphasized ? { strokeWidth: EMPHASIZED_STROKE_WIDTH } : {}),
      },
    });
  });
}
