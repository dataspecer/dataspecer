import { describe, expect, it, vi } from "vitest";
import {
  createAutosaveQueue,
  type AutosaveSnapshot,
} from "./use-autosave.ts";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";

describe("createAutosaveQueue", () => {
  it("persists a snapshot passed to flush without a prior schedule", async () => {
    const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(
      () => Promise.resolve(),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const current = snapshot(graph("current"));

    await queue.flush(current);

    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(current);
  });

  it("coalesces pending snapshots to the newest state", async () => {
    const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(
      () => Promise.resolve(),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const first = snapshot(graph("first"));
    const latest = snapshot(graph("latest"));

    queue.schedule(first);
    queue.schedule(latest);
    await queue.flush();

    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(latest);
  });

  it("serializes an in-flight write before a newer flush", async () => {
    const resolutions: Array<() => void> = [];
    const persist = vi.fn(
      (_snapshot: AutosaveSnapshot) =>
        new Promise<void>((resolve) => {
          resolutions.push(resolve);
        }),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const first = snapshot(graph("first"));
    const latest = snapshot(graph("latest"));

    queue.schedule(first);
    const firstFlush = queue.flush();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    queue.schedule(latest);
    const latestFlush = queue.flush(latest);
    expect(persist).toHaveBeenNthCalledWith(1, first);

    resolutions[0]();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    expect(persist).toHaveBeenNthCalledWith(2, latest);
    resolutions[1]();
    await Promise.all([firstFlush, latestFlush]);
  });

  it("reports a failed write without retrying the unchanged snapshot", async () => {
    const error = new Error("save failed");
    const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(
      () => Promise.reject(error),
    );
    const states: string[] = [];
    const queue = createAutosaveQueue(persist, (state) => states.push(state));

    queue.schedule(snapshot(graph("changed")));

    await expect(queue.flush()).rejects.toBe(error);
    expect(persist).toHaveBeenCalledOnce();
    expect(states).toEqual(["saving", "error"]);
  });

  it("resolves a flush whose snapshot saves after an earlier write failed", async () => {
    const error = new Error("first save failed");
    const settlers: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    const persist = vi.fn(
      (_snapshot: AutosaveSnapshot) =>
        new Promise<void>((resolve, reject) => {
          settlers.push({ resolve, reject });
        }),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const first = snapshot(graph("first"));
    const latest = snapshot(graph("latest"));

    queue.schedule(first);
    const firstFlush = queue.flush();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const latestFlush = queue.flush(latest);
    settlers[0].reject(error);
    await expect(firstFlush).rejects.toBe(error);

    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    expect(persist).toHaveBeenNthCalledWith(2, latest);
    settlers[1].resolve();
    await expect(latestFlush).resolves.toBeUndefined();
  });

  it("saves a scheduled snapshot in the background after an earlier write failed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const error = new Error("first save failed");
      let attempts = 0;
      const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(() => {
        attempts += 1;
        return attempts === 1 ? Promise.reject(error) : Promise.resolve();
      });
      const states: string[] = [];
      const queue = createAutosaveQueue(persist, (state) => states.push(state), 1);
      const first = snapshot(graph("first"));
      const latest = snapshot(graph("latest"));

      queue.schedule(first);
      await vi.waitFor(() => expect(states).toContain("error"));

      queue.schedule(latest);
      await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
      expect(persist).toHaveBeenNthCalledWith(2, latest);
      await vi.waitFor(() => expect(states).toEqual(["saving", "error", "saving", "saved"]));
      expect(consoleError).toHaveBeenCalledWith(error);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rejects each flush with its own error when every write fails", async () => {
    const firstError = new Error("first save failed");
    const latestError = new Error("latest save failed");
    const settlers: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    const persist = vi.fn(
      (_snapshot: AutosaveSnapshot) =>
        new Promise<void>((resolve, reject) => {
          settlers.push({ resolve, reject });
        }),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const first = snapshot(graph("first"));
    const latest = snapshot(graph("latest"));

    queue.schedule(first);
    const firstFlush = queue.flush();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const latestFlush = queue.flush(latest);
    settlers[0].reject(firstError);
    await expect(firstFlush).rejects.toBe(firstError);

    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
    settlers[1].reject(latestError);
    await expect(latestFlush).rejects.toBe(latestError);
  });

  it("refuses a graph the editor could not load again", async () => {
    const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(
      () => Promise.resolve(),
    );
    const setSaveState = vi.fn();
    const queue = createAutosaveQueue(persist, setSaveState);

    await queue.flush(snapshot({ ...graph("valid"), name: "" }));

    expect(persist).not.toHaveBeenCalled();
    expect(setSaveState).toHaveBeenCalledWith("invalid");
  });

  it("persists again once the graph is valid", async () => {
    const persist = vi.fn<(_snapshot: AutosaveSnapshot) => Promise<void>>(
      () => Promise.resolve(),
    );
    const setSaveState = vi.fn();
    const queue = createAutosaveQueue(persist, setSaveState);

    await queue.flush(snapshot({ ...graph("valid"), name: "" }));
    const repaired = snapshot(graph("repaired"));
    await queue.flush(repaired);

    expect(persist).toHaveBeenCalledExactlyOnceWith(repaired);
    expect(setSaveState).toHaveBeenLastCalledWith("saved");
  });

  it("stops persisting after dispose", async () => {
    const settlers: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    const persist = vi.fn(
      (_snapshot: AutosaveSnapshot) =>
        new Promise<void>((resolve, reject) => {
          settlers.push({ resolve, reject });
        }),
    );
    const queue = createAutosaveQueue(persist, vi.fn());
    const first = snapshot(graph("first"));
    const latest = snapshot(graph("latest"));

    queue.schedule(first);
    const firstFlush = queue.flush();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const latestFlush = queue.flush(latest);
    queue.dispose();
    settlers[0].resolve();

    await Promise.all([firstFlush, latestFlush]);
    queue.schedule(snapshot(graph("after-dispose")));
    await queue.flush();
    expect(persist).toHaveBeenCalledOnce();
  });
});

function snapshot(value: ApplicationGraph): AutosaveSnapshot {
  return {
    resourceIri: "urn:graph",
    graph: value,
    positions: {},
  };
}

function graph(name: string): ApplicationGraph {
  return {
    name,
    dataSpecificationIri: "urn:specification",
    datasources: [],
    nodes: [],
    edges: [],
  };
}
