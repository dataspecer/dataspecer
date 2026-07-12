import { describe, expect, it } from "vitest";
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
} from "@dataspecer/app-generator/graph";
import {
  addEdge,
  addNode,
  nextEdgeId,
  nextNodeId,
  removeEdge,
  removeNode,
  updateEdge,
  updateNode,
} from "./mutations.ts";

function graphFixture(): ApplicationGraph {
  return {
    name: "Test",
    dataSpecificationIri: "urn:spec",
    datasources: [{ id: "ds", type: DatasourceType.Rdf, endpoint: "http://example.org/sparql" }],
    nodes: [
      { id: "books.list", aggregateIri: "urn:agg:book", operation: Operation.ReadList },
      { id: "books.detail", aggregateIri: "urn:agg:book", operation: Operation.ReadDetail },
    ],
    edges: [
      {
        id: "books.list-books.detail",
        source: "books.list",
        target: "books.detail",
        type: EdgeType.Transition,
      },
    ],
  };
}

describe("nextNodeId", () => {
  it("derives the id from the aggregate name and operation", () => {
    expect(nextNodeId(graphFixture(), "Book", Operation.Create)).toBe("book.create");
  });

  it("strips diacritics and spaces from aggregate names", () => {
    expect(nextNodeId(graphFixture(), "Turistický cíl", Operation.ReadList)).toBe(
      "turisticky-cil.list",
    );
  });

  it("appends a counter when the id is taken", () => {
    expect(nextNodeId(graphFixture(), "Books", Operation.ReadList)).toBe("books.list-2");
  });
});

describe("nextEdgeId", () => {
  it("joins the endpoint ids and dedupes with a counter", () => {
    expect(nextEdgeId(graphFixture(), "books.detail", "books.list")).toBe(
      "books.detail-books.list",
    );
    expect(nextEdgeId(graphFixture(), "books.list", "books.detail")).toBe(
      "books.list-books.detail-2",
    );
  });
});

describe("node mutations", () => {
  it("adds a node", () => {
    const graph = addNode(graphFixture(), {
      id: "books.create",
      aggregateIri: "urn:agg:book",
      operation: Operation.Create,
    });
    expect(graph.nodes.map((node) => node.id)).toContain("books.create");
  });

  it("removes a node together with its edges", () => {
    const graph = removeNode(graphFixture(), "books.detail");
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it("patches a node without touching the others", () => {
    const graph = updateNode(graphFixture(), "books.list", {
      config: { pageTitle: "Books" },
    });
    expect(graph.nodes[0].config?.pageTitle).toBe("Books");
    expect(graph.nodes[1].config).toBeUndefined();
  });
});

describe("edge mutations", () => {
  it("adds and removes an edge", () => {
    const withEdge = addEdge(graphFixture(), {
      id: "books.detail-books.list",
      source: "books.detail",
      target: "books.list",
      type: EdgeType.Transition,
    });
    expect(withEdge.edges).toHaveLength(2);
    expect(removeEdge(withEdge, "books.detail-books.list").edges).toHaveLength(1);
  });

  it("patches the edge type", () => {
    const graph = updateEdge(graphFixture(), "books.list-books.detail", {
      type: EdgeType.Redirect,
    });
    expect(graph.edges[0].type).toBe(EdgeType.Redirect);
  });
});
