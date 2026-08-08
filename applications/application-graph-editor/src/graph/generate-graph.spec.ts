import { describe, expect, it } from "vitest";
import {
  DatasourceType,
  EdgeType,
  FieldKind,
  Operation,
  type AggregateMetadata,
  type ApplicationGraph,
} from "@dataspecer/app-generator/graph";
import { skeletonGraph } from "./generate-graph.ts";

const GRAPH_CLASS = "urn:class:graph";
const NODE_CLASS = "urn:class:node";

function aggregatesFixture(): AggregateMetadata[] {
  return [
    { iri: "urn:agg:graph-list", name: "GraphList", classIri: GRAPH_CLASS, fields: [] },
    {
      iri: "urn:agg:graph-detail",
      name: "GraphDetail",
      classIri: GRAPH_CLASS,
      fields: [
        {
          path: "content",
          label: "Content",
          kind: FieldKind.Association,
          fields: [
            {
              path: "node",
              label: "Node",
              kind: FieldKind.Association,
              targetClassIri: NODE_CLASS,
            },
          ],
        },
      ],
    },
    { iri: "urn:agg:node-detail", name: "NodeDetail", classIri: NODE_CLASS, fields: [] },
  ];
}

function baseFixture(): ApplicationGraph {
  return {
    name: "Test",
    dataSpecificationIri: "urn:spec",
    datasources: [{ id: "ds", type: DatasourceType.Rdf, endpoint: "http://example.org/sparql" }],
    nodes: [{ id: "left-over", aggregateIri: "urn:agg:graph-list", operation: Operation.ReadList }],
    edges: [],
  };
}

const LIST_AND_DETAIL: ReadonlySet<Operation> = new Set([
  Operation.ReadList,
  Operation.ReadDetail,
]);

const ALL_OPERATIONS: ReadonlySet<Operation> = new Set([
  Operation.ReadList,
  Operation.ReadDetail,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
]);

function edgePairs(graph: ApplicationGraph): string[] {
  return graph.edges.map((edge) => `${edge.source}>${edge.target}`);
}

describe("skeletonGraph", () => {
  it("creates one list and one detail per class and drops the old nodes", () => {
    const graph = skeletonGraph(baseFixture(), aggregatesFixture(), LIST_AND_DETAIL);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      "graph-list.list",
      "graph-detail.detail",
      "node-detail.list",
      "node-detail.detail",
    ]);
  });

  it("keeps everything except nodes and edges from the base graph", () => {
    const base = baseFixture();
    const graph = skeletonGraph(base, aggregatesFixture(), LIST_AND_DETAIL);
    expect(graph.name).toBe(base.name);
    expect(graph.dataSpecificationIri).toBe(base.dataSpecificationIri);
    expect(graph.datasources).toEqual(base.datasources);
  });

  it("puts the write forms only on the richest structure of the class", () => {
    const graph = skeletonGraph(baseFixture(), aggregatesFixture(), ALL_OPERATIONS);
    const ids = graph.nodes.map((node) => node.id);
    expect(ids).toContain("graph-detail.create");
    expect(ids).toContain("graph-detail.update");
    expect(ids).toContain("graph-detail.delete");
    expect(ids.filter((id) => id.startsWith("graph-list."))).toEqual(["graph-list.list"]);
  });

  it("wires the page flow of a class across its structures", () => {
    const pairs = edgePairs(skeletonGraph(baseFixture(), aggregatesFixture(), ALL_OPERATIONS));
    expect(pairs).toContain("graph-list.list>graph-detail.detail");
    expect(pairs).toContain("graph-list.list>graph-detail.create");
    expect(pairs).toContain("graph-detail.detail>graph-detail.update");
    expect(pairs).toContain("graph-detail.detail>graph-detail.delete");
  });

  it("wires the page flow of a class with a single structure", () => {
    const pairs = edgePairs(skeletonGraph(baseFixture(), aggregatesFixture(), ALL_OPERATIONS));
    expect(pairs).toContain("node-detail.list>node-detail.detail");
    expect(pairs).toContain("node-detail.list>node-detail.create");
    expect(pairs).toContain("node-detail.detail>node-detail.update");
    expect(pairs).toContain("node-detail.detail>node-detail.delete");
  });

  it("redirects delete to the list and create and update to the detail", () => {
    const graph = skeletonGraph(baseFixture(), aggregatesFixture(), ALL_OPERATIONS);
    const redirects = graph.edges
      .filter((edge) => edge.type === EdgeType.Redirect)
      .map((edge) => `${edge.source}>${edge.target}`);
    expect(redirects).toContain("graph-detail.create>graph-detail.detail");
    expect(redirects).toContain("graph-detail.update>graph-detail.detail");
    expect(redirects).toContain("graph-detail.delete>graph-list.list");
    expect(redirects).toContain("node-detail.create>node-detail.detail");
    expect(redirects).toContain("node-detail.delete>node-detail.list");
    expect(redirects).toHaveLength(6);
  });

  it("gives further structures of a class no pages", () => {
    const middle: AggregateMetadata = {
      iri: "urn:agg:graph-summary",
      name: "GraphSummary",
      classIri: GRAPH_CLASS,
      fields: [{ path: "name", label: "Name", kind: FieldKind.Primitive }],
    };
    // listed before the flat projection on purpose, the order must not decide
    const [graphList, graphDetail, nodeDetail] = aggregatesFixture();
    const graph = skeletonGraph(
      baseFixture(),
      [middle, graphList, graphDetail, nodeDetail],
      ALL_OPERATIONS,
    );
    expect(graph.nodes.some((node) => node.id.startsWith("graph-summary."))).toBe(false);
    expect(edgePairs(graph)).toContain("graph-detail.delete>graph-list.list");
  });

  it("links a detail to the details of nested association targets, a list only to top level ones", () => {
    const pairs = edgePairs(skeletonGraph(baseFixture(), aggregatesFixture(), LIST_AND_DETAIL));
    expect(pairs).toContain("graph-detail.detail>node-detail.detail");
    expect(pairs).not.toContain("graph-list.list>node-detail.detail");
    expect(pairs).not.toContain("graph-detail.detail>graph-detail.detail");
  });

  it("skips structures that were not selected", () => {
    const [graphList, , nodeDetail] = aggregatesFixture();
    const graph = skeletonGraph(baseFixture(), [graphList, nodeDetail], LIST_AND_DETAIL);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      "graph-list.list",
      "graph-list.detail",
      "node-detail.list",
      "node-detail.detail",
    ]);
    expect(edgePairs(graph)).toEqual([
      "graph-list.list>graph-list.detail",
      "node-detail.list>node-detail.detail",
    ]);
  });

  it("builds nothing from an empty selection", () => {
    const graph = skeletonGraph(baseFixture(), aggregatesFixture(), new Set());
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
