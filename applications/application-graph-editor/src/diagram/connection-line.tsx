import { useViewport, type ConnectionLineComponentProps } from '@xyflow/react';
import { BODY_TARGET_HANDLE_ID } from './operation-node.tsx';

const STROKE = '#94a3b8';

/**
 * The line shown while dragging a new connection.
 */
export function ConnectionLine(props: ConnectionLineComponentProps) {
  const viewport = useViewport();
  // React Flow reports the pointer relative to the viewport, while this path uses canvas coordinates
  const endpoint =
    props.toHandle?.id === BODY_TARGET_HANDLE_ID
      ? {
          x: (props.pointer.x - viewport.x) / viewport.zoom,
          y: (props.pointer.y - viewport.y) / viewport.zoom,
        }
      : { x: props.toX, y: props.toY };

  // dotted, so the in-flight line is not mistaken for the dashed redirect style
  return (
    <path
      fill="none"
      stroke={STROKE}
      strokeWidth={1.2}
      strokeDasharray="1 3"
      strokeLinecap="round"
      d={`M ${(props.fromX)},${(props.fromY)} L ${endpoint.x},${endpoint.y}`}
    />
  );
}
