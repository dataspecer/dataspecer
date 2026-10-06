import { describe, expect, it } from "vitest";
import { arrowhead, attachment, cardinalityPosition, labelPosition, route, textWidth } from "./geometry.ts";

describe("edge geometry", () => {
  const source = { x: 0, y: 0, width: 200, height: 100 };

  it.each([0.000001, 0.01, 1, 100, 1000000])("keeps corner cardinalities near the endpoint at slope %s", slope => {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const point = { x: sx < 0 ? 0 : 200, y: sy < 0 ? 0 : 100 };
      const adjacent = { x: point.x + sx * 100, y: point.y + sy * 100 * slope };
      const label = cardinalityPosition(point, adjacent, source, 48, 20);
      expect(Math.hypot(label.x + 24 - point.x, label.y + 10 - point.y)).toBeLessThan(70);
      expect(label.x >= 206 - 1e-8 || label.x + 48 <= -6 + 1e-8
        || label.y >= 106 - 1e-8 || label.y + 20 <= -6 + 1e-8).toBe(true);
    }
  });

  it.each([
    [{ x: 200, y: 50 }, { x: 400, y: 50 }],
    [{ x: 0, y: 50 }, { x: -200, y: 50 }],
    [{ x: 100, y: 0 }, { x: 100, y: -200 }],
    [{ x: 100, y: 100 }, { x: 100, y: 300 }],
    [{ x: 200, y: 100 }, { x: 400, y: 300 }],
    [{ x: 0, y: 0 }, { x: -200, y: -200 }],
  ])("keeps cardinality backgrounds clear of the node and arrow at %j", (point, adjacent) => {
    const width = 48;
    const height = 20;
    const label = cardinalityPosition(point, adjacent, source, width, height);
    expect(label.x >= source.x + source.width + 6 || label.x + width <= source.x - 6
      || label.y >= source.y + source.height + 6 || label.y + height <= source.y - 6).toBe(true);
    const dx = adjacent.x - point.x;
    const dy = adjacent.y - point.y;
    const distances = [label, { x: label.x + width, y: label.y },
      { x: label.x, y: label.y + height }, { x: label.x + width, y: label.y + height }]
      .map(corner => (dx * (corner.y - point.y) - dy * (corner.x - point.x)) / Math.hypot(dx, dy));
    expect(distances.every(value => value >= 7.999) || distances.every(value => value <= -7.999)).toBe(true);
  });

  it("attaches horizontal and vertical edges at the overlap midpoint", () => {
    expect(route(source, { x: 400, y: 50, width: 200, height: 100 }, [], false))
      .toEqual([{ x: 200, y: 75 }, { x: 400, y: 75 }]);
    expect(route(source, { x: 50, y: 300, width: 200, height: 100 }, [], false))
      .toEqual([{ x: 125, y: 100 }, { x: 125, y: 300 }]);
  });

  it("preserves supplied waypoints and puts both endpoints on the node border", () => {
    const middle = [{ x: 300, y: 50 }, { x: 300, y: 250 }];
    const result = route(source, { x: 400, y: 200, width: 200, height: 100 }, middle, false);
    expect(result).toEqual([{ x: 200, y: 50 }, ...middle, { x: 400, y: 250 }]);
  });

  it("intersects diagonal connections with the rectangle boundary", () => {
    expect(attachment(source, { x: 400, y: 200 })).toEqual({ x: 200, y: 100 });
  });

  it("handles one, two, and three-point paths without invalid label coordinates", () => {
    expect(labelPosition([{ x: 2, y: 3 }])).toEqual({ x: 2, y: 3 });
    expect(labelPosition([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toEqual({ x: 50, y: 0 });
    expect(labelPosition([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])).toEqual({ x: 100, y: 50 });
  });

  it("orients arrowheads using the final segment", () => {
    expect(arrowhead([{ x: 0, y: 0 }, { x: 100, y: 0 }]))
      .toEqual([{ x: 84, y: -6 }, { x: 100, y: 0 }, { x: 84, y: 6 }]);
    expect(arrowhead([{ x: 0, y: 0 }])).toEqual([]);
    expect(arrowhead([{ x: 0, y: 0 }, { x: 0, y: 0 }])).toEqual([]);
  });

  it("accounts for narrow, wide, and combining glyphs without browser metrics", () => {
    expect(textWidth("WWW", 16)).toBeGreaterThan(textWidth("iii", 16));
    expect(textWidth("a\u0301", 16)).toBe(textWidth("a", 16));
    expect(textWidth("Žluťoučký 東京", 16)).toBeGreaterThan(0);
  });

  it("accounts for narrow URL characters and wide lowercase letters", () => {
    const iri = "https://example.com/vocabulary#PersonalProfileDocument";
    expect(textWidth(iri, 16)).toBeLessThan(textWidth(iri.replace(/[rft/]/g, "n"), 16));
    expect(textWidth("mmmwww", 16)).toBeGreaterThan(textWidth("nnnnnn", 16));
    expect(textWidth(iri, 32)).toBeCloseTo(textWidth(iri, 16) * 2);
  });
});
