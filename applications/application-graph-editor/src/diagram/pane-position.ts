import type { Viewport, XYPosition } from '@xyflow/react';
import { NODE_SIZE } from './node-size.ts';

/**
 * Turns a point measured inside the pane into a graph position.
 */
export function paneToGraph(viewport: Viewport, point: XYPosition): XYPosition {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

/** Places a node so that the point sits in its middle */
export function centeredOn(position: XYPosition): XYPosition {
  return { x: position.x - NODE_SIZE.width / 2, y: position.y - NODE_SIZE.height / 2 };
}
