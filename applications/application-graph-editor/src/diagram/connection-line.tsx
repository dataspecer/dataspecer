import type { ConnectionLineComponentProps } from '@xyflow/react';

const STROKE = '#94a3b8';

/**
 * The line shown while dragging a new connection.
 */
export function ConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  // dotted, so the in-flight line is not mistaken for the dashed redirect style
  return (
    <path
      fill="none"
      stroke={STROKE}
      strokeWidth={1.2}
      strokeDasharray="1 3"
      strokeLinecap="round"
      d={`M ${fromX},${fromY} L ${toX},${toY}`}
    />
  );
}
