import { useConnection, type ConnectionLineComponentProps } from "@xyflow/react";
import {
  isValidRedirectOperation,
  isValidTransitionOperation,
} from "@dataspecer/app-generator/graph";
import type { OperationFlowNode } from "./graph-to-flow.ts";

const VALID_STROKE = "#16a34a";
const INVALID_STROKE = "#dc2626";
const UNDECIDED_STROKE = "#94a3b8";

/**
 * The line shown while dragging a new connection. Over a target node it turns green when the
 * operation pair allows a transition or redirect and red when it allows neither, so the outcome
 * is visible before dropping.
 */
export function ConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  const connection = useConnection<OperationFlowNode>();

  let stroke = UNDECIDED_STROKE;
  if (connection.inProgress && connection.toNode) {
    const source = connection.fromNode.data.node.operation;
    const target = connection.toNode.data.node.operation;
    const allowed =
      isValidTransitionOperation(source, target) || isValidRedirectOperation(source, target);
    stroke = allowed ? VALID_STROKE : INVALID_STROKE;
  }

  // dotted, so the in-flight line is not mistaken for the dashed redirect style
  return (
    <path
      fill="none"
      stroke={stroke}
      strokeWidth={1.2}
      strokeDasharray="1 3"
      strokeLinecap="round"
      d={`M ${fromX},${fromY} L ${toX},${toY}`}
    />
  );
}
