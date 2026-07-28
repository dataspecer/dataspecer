interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Returns the point where the line from the center towards `target` crosses the border. */
export function rectBorderTowards(rect: Rect, target: Point): Point {
  const center = rectCenter(rect);
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (dx === 0 && dy === 0) {
    return center;
  }
  const scaleX = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY, 1);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/**
 * Returns the control point that bends an edge's quadratic path.
 */
export function curveControlPoint(
  a: Point,
  b: Point,
  inSortedOrder: boolean,
  offset: number,
): Point {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (offset === 0) {
    return mid;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return mid;
  }
  const side = inSortedOrder ? 1 : -1;
  return {
    x: mid.x + (-dy / length) * offset * side,
    y: mid.y + (dx / length) * offset * side,
  };
}

/**
 * Spreads the edges connecting the same two nodes so they do not cover each other. An edge
 * without a counterpart gets offset zero.
 */
export function parallelEdgeOffsets(
  edges: ReadonlyArray<{ id: string; source: string; target: string }>,
  spacing = 40,
): Record<string, number> {
  const groups = new Map<string, string[]>();
  for (const edge of edges) {
    // sorted, so the two directions of a pair share the group
    const key = [edge.source, edge.target].sort().join("|");
    const group = groups.get(key);
    if (group) {
      group.push(edge.id);
    } else {
      groups.set(key, [edge.id]);
    }
  }

  const offsets: Record<string, number> = {};
  for (const ids of groups.values()) {
    ids.forEach((id, index) => {
      offsets[id] = (index - (ids.length - 1) / 2) * spacing;
    });
  }
  return offsets;
}
