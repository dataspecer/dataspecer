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
  isGeneratedNodeId,
  nextEdgeId,
  nextNodeId,
  removeEdge,
  removeNode,
  renameNode,
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

  it("does not collide with the excluded node's own id", () => {
    expect(nextNodeId(graphFixture(), "Books", Operation.ReadList, "books.list")).toBe(
      "books.list",
    );
  });
});

describe("isGeneratedNodeId", () => {
  it("recognizes the ID the scheme derives", () => {
    expect(isGeneratedNodeId("books.list", "Books", Operation.ReadList)).toBe(true);
  });

  it("recognizes an ID with a collision counter", () => {
    expect(isGeneratedNodeId("books.list-2", "Books", Operation.ReadList)).toBe(true);
  });

  it("rejects an ID of another aggregate or operation", () => {
    expect(isGeneratedNodeId("books.list", "Authors", Operation.ReadList)).toBe(false);
    expect(isGeneratedNodeId("books.list", "Books", Operation.Create)).toBe(false);
  });

  it("rejects a hand written ID", () => {
    expect(isGeneratedNodeId("catalogue", "Books", Operation.ReadList)).toBe(false);
    expect(isGeneratedNodeId("books.list-page", "Books", Operation.ReadList)).toBe(false);
  });
});

describe("renameNode", () => {
  it("renames the node and rewrites its edges", () => {
    const graph = renameNode(graphFixture(), "books.detail", "book.detail");
    expect(graph.nodes.map((node) => node.id)).toContain("book.detail");
    expect(graph.edges[0].target).toBe("book.detail");
    expect(graph.edges[0].source).toBe("books.list");
  });

  it("regenerates a derived edge id to follow the new endpoints", () => {
    const graph = renameNode(graphFixture(), "books.detail", "book.detail");
    expect(graph.edges[0].id).toBe("books.list-book.detail");
  });

  it("keeps a hand-written edge id", () => {
    const base = graphFixture();
    base.edges[0].id = "list-to-detail";
    const graph = renameNode(base, "books.detail", "book.detail");
    expect(graph.edges[0].id).toBe("list-to-detail");
    expect(graph.edges[0].target).toBe("book.detail");
  });

  it("dedupes a regenerated edge id against an existing one", () => {
    const base = graphFixture();
    base.edges.push({
      id: "book.list-books.detail",
      source: "books.list",
      target: "books.detail",
      type: EdgeType.Transition,
    });
    const graph = renameNode(base, "books.list", "book.list");
    // the second edge ID is manually overwritten relative to its old endpoints, so it stays and the
    // regenerated first edge ID steps around it
    expect(graph.edges.map((edge) => edge.id)).toEqual([
      "book.list-books.detail-2",
      "book.list-books.detail",
    ]);
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
