import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import {
  curveControlPoint,
  rectBorderTowards,
  rectCenter,
  type Rect,
} from "./edge-geometry.ts";

/**
 * An edge attaching to the nearest border point of its nodes instead of fixed handles.
 */
export function FloatingEdge(props: EdgeProps) {
  const sourceNode = useInternalNode(props.source);
  const targetNode = useInternalNode(props.target);
  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceRect = nodeRect(sourceNode);
  const targetRect = nodeRect(targetNode);
  const offset = typeof props.data?.offset === "number" ? props.data.offset : 0;

  let path: string;
  if (props.source === props.target) {
    path = selfLoopPath(sourceRect);
  } else {
    // both endpoints aim at the control point, so the curve leaves the borders smoothly
    const control = curveControlPoint(
      rectCenter(sourceRect),
      rectCenter(targetRect),
      props.source < props.target,
      offset,
    );
    const start = rectBorderTowards(sourceRect, control);
    const end = rectBorderTowards(targetRect, control);
    path = `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`;
  }

  return <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />;
}

function nodeRect(node: {
  internals: { positionAbsolute: { x: number; y: number } };
  measured: { width?: number; height?: number };
}): Rect {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width ?? 0,
    height: node.measured.height ?? 0,
  };
}

/** A loop above the node's top right corner for an edge from a node to itself. */
function selfLoopPath(rect: Rect): string {
  const startX = rect.x + rect.width * 0.75;
  const endY = rect.y + rect.height * 0.25;
  const rightX = rect.x + rect.width;
  return (
    `M ${startX},${rect.y} ` +
    `C ${startX},${rect.y - 45} ${rightX + 55},${endY} ${rightX},${endY}`
  );
}
