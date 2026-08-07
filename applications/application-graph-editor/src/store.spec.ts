import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DatasourceType,
  EdgeType,
  Operation,
  ViolationCode,
  ViolationSeverity,
  type ApplicationGraph,
  type Violation,
} from "@dataspecer/app-generator/graph";
import { useEditorStore } from "./store.ts";

function graphFixture(): ApplicationGraph {
  return {
    name: "Test",
    dataSpecificationIri: "urn:spec",
    datasources: [{ id: "ds", type: DatasourceType.Rdf, endpoint: "http://example.org/sparql" }],
    nodes: [{ id: "books.list", aggregateIri: "urn:agg:book", operation: Operation.ReadList }],
    edges: [],
  };
}

function steps(): number {
  return useEditorStore.temporal.getState().pastStates.length;
}

function type(text: string): void {
  for (let length = 1; length <= text.length; length += 1) {
    useEditorStore.getState().updateGraphMeta({ name: text.slice(0, length) });
    vi.advanceTimersByTime(80);
  }
}

describe("undo history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().initialize("urn:resource", graphFixture(), {});
    useEditorStore.temporal.getState().clear();
    // the application loads once, the tests reload the same store and have to let the run close
    vi.advanceTimersByTime(600);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a run of changes as one step", () => {
    type("Books");
    expect(steps()).toBe(1);
    expect(useEditorStore.getState().graph?.name).toBe("Books");
  });

  it("undoes the whole run at once", () => {
    type("Books");
    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().graph?.name).toBe("Test");
  });

  it("opens a new step once the changes stop for a while", () => {
    type("Books");
    vi.advanceTimersByTime(600);
    type("Booklet");
    expect(steps()).toBe(2);
  });

  it("keeps the change after an undo out of the undone step", () => {
    type("Books");
    useEditorStore.temporal.getState().undo();
    useEditorStore.getState().updateGraphMeta({ name: "Other" });
    expect(steps()).toBe(1);
    useEditorStore.temporal.getState().undo();
    expect(useEditorStore.getState().graph?.name).toBe("Test");
  });

  it("does not record selecting a node", () => {
    useEditorStore.getState().setSelection({ kind: "node", id: "books.list" });
    expect(steps()).toBe(0);
  });
});

function generationViolation(): Violation {
  return {
    code: ViolationCode.SemanticInvalidTransition,
    message: "Reported by the server.",
    severity: ViolationSeverity.Error,
    path: "/nodes/0",
  };
}

describe("generation violations", () => {
  beforeEach(() => {
    useEditorStore.getState().initialize("urn:resource", graphFixture(), {});
    useEditorStore.getState().setGenerationViolations([generationViolation()]);
  });

  it("clears them when the graph changes, so they cannot block the next attempt", () => {
    useEditorStore.getState().updateGraphMeta({ name: "Other" });
    expect(useEditorStore.getState().generationViolations).toBeNull();
  });

  it("clears them when the graph is replaced", () => {
    useEditorStore.getState().replaceGraph(graphFixture(), {});
    expect(useEditorStore.getState().generationViolations).toBeNull();
  });

  it("keeps them while only positions change", () => {
    useEditorStore.getState().moveNodes([{ id: "books.list", position: { x: 10, y: 20 } }]);
    expect(useEditorStore.getState().generationViolations).not.toBeNull();
  });
});

describe("canvas selection requests", () => {
  beforeEach(() => {
    useEditorStore.getState().initialize("urn:resource", graphFixture(), {});
  });

  it("follows a renamed node that was selected", () => {
    const store = useEditorStore.getState();
    store.setSelection({ kind: "node", id: "books.list" });
    store.renameNode("books.list", "books.overview");
    const state = useEditorStore.getState();
    expect(state.selection).toEqual({ kind: "node", id: "books.overview" });
    expect(state.selectRequest?.id).toBe("books.overview");
  });

  it("leaves the selection alone when another element was selected", () => {
    const store = useEditorStore.getState();
    store.setSelection({ kind: "node", id: "other" });
    const before = useEditorStore.getState().selectRequest;
    store.renameNode("books.list", "books.overview");
    const state = useEditorStore.getState();
    expect(state.selection).toEqual({ kind: "node", id: "other" });
    expect(state.selectRequest).toBe(before);
  });

  it("asks the canvas to select a new edge", () => {
    useEditorStore.getState().addEdge({
      id: "books.list-books.list",
      source: "books.list",
      target: "books.list",
      type: EdgeType.Transition,
    });
    const state = useEditorStore.getState();
    expect(state.selection).toEqual({ kind: "edge", id: "books.list-books.list" });
    expect(state.selectRequest?.id).toBe("books.list-books.list");
  });

  it("asks the canvas to select an added node", () => {
    useEditorStore.getState().addNode(
      { id: "books.detail", aggregateIri: "urn:agg:book", operation: Operation.ReadDetail },
      { x: 0, y: 0 },
    );
    expect(useEditorStore.getState().selectRequest?.id).toBe("books.detail");
  });
});
