import type { CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEditorStore } from "@/store.ts";
import { OPERATION_BADGE, OPERATION_LABELS } from "./operation-style.ts";
import type { OperationFlowNode } from "./graph-to-flow.ts";
import { NODE_SIZE } from "./node-size.ts";

const VIOLATION_BORDER = {
  error: "border-red-500 bg-red-50",
  warning: "border-amber-500 bg-amber-50",
};

/**
 * One application graph node on the canvas.
 */
export function OperationNode(props: NodeProps<OperationFlowNode>) {
  const { node, violation, highlighted, dimmed } = props.data;
  const aggregateName = useEditorStore(
    (state) =>
      state.metadata?.aggregates.find((entry) => entry.iri === node.aggregateIri)?.name,
  );
  const title = aggregateName ?? node.config?.pageTitle ?? node.id;
  const subtitle = node.config?.pageTitle;

  return (
    <div
      style={{ width: NODE_SIZE.width }}
      className={`rounded-md border px-3 py-2 shadow-sm transition-opacity ${
        violation ? VIOLATION_BORDER[violation] : "border-sky-300 bg-sky-50"
      } ${props.selected || highlighted ? "ring-2 ring-blue-500" : ""} ${
        dimmed ? "opacity-25" : ""
      }`}
    >
      {BORDER_HANDLES.map(({ id, position }) => (
        <Handle key={id} id={id} type="source" position={position} style={borderHandleStyle(id)} />
      ))}
      <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-sm font-medium ${OPERATION_BADGE[node.operation]}`}
        >
          {OPERATION_LABELS[node.operation]}
        </span>
        {subtitle && <span className="min-w-0 truncate text-sm text-slate-500">{subtitle}</span>}
      </div>
      <div className="mt-1 truncate text-xs text-slate-400">{node.id}</div>
    </div>
  );
}

const BORDER_HANDLES = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

const BORDER_HANDLE_THICKNESS = 10;

function borderHandleStyle(side: (typeof BORDER_HANDLES)[number]["id"]): CSSProperties {
  const horizontal = side === "top" || side === "bottom";
  return {
    [side]: 0,
    ...(horizontal ? { left: 0, width: "100%", height: BORDER_HANDLE_THICKNESS } : {}),
    ...(horizontal ? {} : { top: 0, height: "100%", width: BORDER_HANDLE_THICKNESS }),
    transform: "none",
    borderRadius: 0,
    border: "none",
    background: "transparent",
    minWidth: 0,
    minHeight: 0,
  };
}
