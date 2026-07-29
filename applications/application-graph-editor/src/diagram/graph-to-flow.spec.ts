import { describe, expect, it } from "vitest";
import { DatasourceType, EdgeType, Operation, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { projectEdges, type SelectedIds } from "./graph-to-flow.ts";

const NOTHING_FLAGGED = { nodes: new Map(), edges: new Map() };

const NOTHING_SELECTED: SelectedIds = { nodes: new Set(), edges: new Set() };

const GRAPH: ApplicationGraph = {
  name: "Test",
  dataSpecificationIri: "urn:spec",
  datasources: [{ id: "ds", type: DatasourceType.Rdf, endpoint: "http://example.org/sparql" }],
  nodes: [
    { id: "books.list", aggregateIri: "urn:agg:book", operation: Operation.ReadList },
    { id: "books.detail", aggregateIri: "urn:agg:book", operation: Operation.ReadDetail },
  ],
  edges: [
    { id: "forward", source: "books.list", target: "books.detail", type: EdgeType.Transition },
    { id: "back", source: "books.detail", target: "books.list", type: EdgeType.Redirect },
  ],
};

function strokes(selected: SelectedIds): Record<string, unknown> {
  const edges = projectEdges(GRAPH, NOTHING_FLAGGED, null, selected, []);
  return Object.fromEntries(edges.map((edge) => [edge.id, edge.style?.stroke]));
}

describe("projectEdges", () => {
  it("leaves an unselected edge without a stroke of its own", () => {
    expect(strokes(NOTHING_SELECTED)).toEqual({ forward: undefined, back: undefined });
  });

  it("colors a selected edge", () => {
    const painted = strokes({ nodes: new Set(), edges: new Set(["forward"]) });
    expect(painted.forward).toBeDefined();
    expect(painted.back).toBeUndefined();
  });

  it("colors every edge of a selected node, including the parallel ones", () => {
    const painted = strokes({ nodes: new Set(["books.list"]), edges: new Set() });
    expect(painted.forward).toBe(painted.back);
    expect(painted.forward).toBeDefined();
  });

  it("colors a selection over a violation", () => {
    const flagged = { nodes: new Map(), edges: new Map([["forward", "error" as const]]) };
    const [forward] = projectEdges(
      GRAPH,
      flagged,
      null,
      { nodes: new Set(["books.list"]), edges: new Set() },
      [],
    );
    const [unselected] = projectEdges(GRAPH, flagged, null, NOTHING_SELECTED, []);
    expect(forward?.style?.stroke).not.toBe(unselected?.style?.stroke);
  });
});
