import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatasourceType, Operation, type ApplicationGraph } from "@dataspecer/app-generator/graph";
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
