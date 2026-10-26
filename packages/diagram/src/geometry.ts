export type Point = { x: number; y: number };
export type Rectangle = Point & { width: number; height: number };

/** Approximates system sans-serif advances without DOM or font-file dependencies. */
export function textWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const character of text) {
    if (/\p{Mark}|[\u200b-\u200f\ufe0e\ufe0f]/u.test(character)) continue;
    if (/\s/u.test(character)) width += 0.28;
    else if (/[ilI.,:;'!|]/u.test(character)) width += 0.28;
    else if (/[ft/\\]/u.test(character)) width += 0.32;
    else if (/[r()\[\]{}-]/u.test(character)) width += 0.36;
    else if (/[csxyz]/u.test(character)) width += 0.5;
    else if (character === "m") width += 0.86;
    else if (character === "w") width += 0.76;
    else if (/[MW@%&]/u.test(character)) width += 0.88;
    else if (/[#=+<>~]/u.test(character)) width += 0.6;
    else if (/\p{Extended_Pictographic}|[\u2e80-\u9fff\uac00-\ud7af]/u.test(character)) width += 1;
    else if (/[JLT]/u.test(character)) width += 0.55;
    else if (/[CGOQ]/u.test(character)) width += 0.74;
    else if (/[A-Z]/u.test(character)) width += 0.66;
    else width += 0.55;
  }
  return width * fontSize;
}

/** Returns a rectangle's geometric center. */
export function center(rect: Rectangle): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Finds a rectangle attachment point, preferring a perpendicular approach. */
export function attachment(rect: Rectangle, towards: Point): Point {
  if (towards.x >= rect.x && towards.x <= rect.x + rect.width) {
    return { x: towards.x, y: towards.y < rect.y ? rect.y : rect.y + rect.height };
  }
  if (towards.y >= rect.y && towards.y <= rect.y + rect.height) {
    return { x: towards.x < rect.x ? rect.x : rect.x + rect.width, y: towards.y };
  }
  const origin = center(rect);
  const dx = towards.x - origin.x;
  const dy = towards.y - origin.y;
  const ratio = Math.min(rect.width / 2 / Math.abs(dx), rect.height / 2 / Math.abs(dy));
  if (!Number.isFinite(ratio)) return { x: rect.x + rect.width, y: origin.y };
  return { x: origin.x + dx * ratio, y: origin.y + dy * ratio };
}

/** Routes between node borders while preserving all supplied intermediate points. */
export function route(source: Rectangle, target: Rectangle, waypoints: Point[], self: boolean): Point[] {
  let points: Point[];
  if (waypoints.length) {
    points = [attachment(source, waypoints[0]), ...waypoints, attachment(target, waypoints.at(-1)!)];
  } else if (self) {
    const x = source.x + source.width;
    const y = source.y + source.height / 2;
    points = [
      { x, y }, { x: x + 40, y }, { x: x + 40, y: source.y - 40 },
      { x: source.x + source.width / 2, y: source.y - 40 },
      { x: source.x + source.width / 2, y: source.y },
    ];
  } else {
    const overlapTop = Math.max(source.y, target.y);
    const overlapBottom = Math.min(source.y + source.height, target.y + target.height);
    const overlapLeft = Math.max(source.x, target.x);
    const overlapRight = Math.min(source.x + source.width, target.x + target.width);
    if (overlapTop <= overlapBottom && overlapLeft > overlapRight) {
      const y = (overlapTop + overlapBottom) / 2;
      const right = source.x < target.x;
      points = [{ x: source.x + (right ? source.width : 0), y }, { x: target.x + (right ? 0 : target.width), y }];
    } else if (overlapLeft <= overlapRight && overlapTop > overlapBottom) {
      const x = (overlapLeft + overlapRight) / 2;
      const below = source.y < target.y;
      points = [{ x, y: source.y + (below ? source.height : 0) }, { x, y: target.y + (below ? 0 : target.height) }];
    } else {
      points = [attachment(source, center(target)), attachment(target, center(source))];
    }
  }
  return points.filter((point, index) => index === 0
    || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
}

/** Places a label on the central segment of a polyline. */
export function labelPosition(points: Point[]): Point {
  const index = Math.floor((points.length - 1) / 2);
  const first = points[index];
  const second = points[index + 1] ?? first;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

/** Computes an arrowhead pointing along the final non-degenerate segment. */
export function arrowhead(points: Point[], length = 16, width = 12): Point[] {
  if (points.length < 2) return [];
  const tip = points.at(-1)!;
  const previous = points.at(-2)!;
  const distance = Math.hypot(tip.x - previous.x, tip.y - previous.y);
  if (!distance) return [];
  const dx = (tip.x - previous.x) / distance;
  const dy = (tip.y - previous.y) / distance;
  return [
    { x: tip.x - length * dx + width / 2 * dy, y: tip.y - length * dy - width / 2 * dx },
    tip,
    { x: tip.x - length * dx - width / 2 * dy, y: tip.y - length * dy + width / 2 * dx },
  ];
}

/** Places a padded label outside the node and beside the endpoint segment. */
export function cardinalityPosition(point: Point, adjacent: Point, node: Rectangle, width: number, height: number): Point {
  const distance = Math.hypot(adjacent.x - point.x, adjacent.y - point.y);
  const dx = distance ? (adjacent.x - point.x) / distance : 1;
  const dy = distance ? (adjacent.y - point.y) / distance : 0;
  // Choose the upper side of horizontal segments and the right side of vertical ones.
  const side = dx > 0 || (dx === 0 && dy < 0) ? -1 : 1;
  const initialAlong = Math.abs(dx) * width / 2 + Math.abs(dy) * height / 2 + 8;
  const candidates = [side, -side].map(direction => {
    const nx = -dy * direction;
    const ny = dx * direction;
    const offset = Math.abs(nx) * width / 2 + Math.abs(ny) * height / 2 + 8;
    const x = point.x + nx * offset;
    const y = point.y + ny * offset;
    const left = node.x - 6 - width / 2;
    const right = node.x + node.width + 6 + width / 2;
    const top = node.y - 6 - height / 2;
    const bottom = node.y + node.height + 6 + height / 2;
    let along = initialAlong;
    const candidateX = x + dx * along;
    const candidateY = y + dy * along;
    if (candidateX > left && candidateX < right && candidateY > top && candidateY < bottom) {
      // Clearing any boundary is sufficient, including either boundary at a corner.
      const exits = [];
      if (dx < 0) exits.push((left - x) / dx);
      if (dx > 0) exits.push((right - x) / dx);
      if (dy < 0) exits.push((top - y) / dy);
      if (dy > 0) exits.push((bottom - y) / dy);
      along = Math.max(along, Math.min(...exits));
    }
    return { x: x + dx * along - width / 2, y: y + dy * along - height / 2,
      distance: Math.hypot(along, offset) };
  });
  const closest = candidates[0].distance <= candidates[1].distance ? candidates[0] : candidates[1];
  return { x: closest.x, y: closest.y };
}
