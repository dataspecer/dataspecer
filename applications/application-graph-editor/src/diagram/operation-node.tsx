import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Operation } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import type { OperationFlowNode } from "./graph-to-flow.ts";

const OPERATION_LABELS: Record<Operation, string> = {
  [Operation.Create]: "Create",
  [Operation.ReadList]: "Read (list)",
  [Operation.ReadDetail]: "Read (detail)",
  [Operation.Update]: "Edit",
  [Operation.Delete]: "Delete",
};

const OPERATION_COLORS: Record<Operation, string> = {
  [Operation.Create]: "bg-green-100 text-green-800",
  [Operation.ReadList]: "bg-sky-100 text-sky-800",
  [Operation.ReadDetail]: "bg-sky-100 text-sky-800",
  [Operation.Update]: "bg-amber-100 text-amber-800",
  [Operation.Delete]: "bg-red-100 text-red-800",
};

/**
 * One application graph node on the canvas. Shows the aggregate name (or the page title as a
 * fallback while metadata is unavailable) with the operation as a subtitle. Nodes the current
 * violations point are highlighted.
 */
export function OperationNode(props: NodeProps<OperationFlowNode>) {
  const { node, invalid } = props.data;
  const aggregateName = useEditorStore(
    (state) =>
      state.metadata?.aggregates.find((entry) => entry.iri === node.aggregateIri)?.name,
  );
  const title = aggregateName ?? node.config?.pageTitle ?? node.id;
  const subtitle = node.config?.pageTitle;

  return (
    <div
      className={`w-60 rounded-md border px-3 py-2 shadow-sm ${
        invalid ? "border-red-500 bg-red-50" : "border-sky-300 bg-sky-50"
      }`}
      title={`${node.id}\n${node.aggregateIri}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${OPERATION_COLORS[node.operation]}`}
        >
          {OPERATION_LABELS[node.operation]}
        </span>
        <span className="truncate text-xs text-slate-500">{subtitle ?? node.id}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
