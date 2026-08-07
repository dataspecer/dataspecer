import { useCallback, useEffect, useRef } from "react";
import { debounce } from "es-toolkit";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore, type NodePositions, type SaveState } from "../store.ts";
import { saveGraph } from "../backend/client.ts";
import { hasValidSyntax } from "../validation/violations.ts";

const SAVE_DEBOUNCE_MS = 800;

export interface AutosaveSnapshot {
  resourceIri: string;
  graph: ApplicationGraph;
  positions: NodePositions;
}

interface AutosaveQueue {
  schedule: (snapshot: AutosaveSnapshot) => void;
  flush: (snapshot?: AutosaveSnapshot) => Promise<void>;
  dispose: () => void;
}

/**
 * Persists the graph and node positions in order. A newer snapshot replaces a pending one and
 * never overtakes a write already in flight.
 */
export function createAutosaveQueue(
  persist: (snapshot: AutosaveSnapshot) => Promise<void>,
  setSaveState: (state: SaveState) => void,
  debounceMs = SAVE_DEBOUNCE_MS,
): AutosaveQueue {
  let pending: AutosaveSnapshot | null = null;
  let chain: Promise<void> = Promise.resolve();
  let disposed = false;

  // Appends one write behind every write queued so far and returns it. The write takes the
  // newest pending snapshot at execution time, so intermediate snapshots coalesce away. The
  // chain swallows the failure so one failed write does not block later ones, while the
  // returned step still rejects for its caller.
  const run = (): Promise<void> => {
    const step = chain.then(async () => {
      const snapshot = pending;
      pending = null;
      if (snapshot === null || disposed) {
        return;
      }

      if (!hasValidSyntax(snapshot.graph)) {
        setSaveState("invalid");
        return;
      }

      setSaveState("saving");
      try {
        await persist(snapshot);
        setSaveState("saved");
      } catch (caught) {
        setSaveState("error");
        throw caught;
      }
    });
    chain = step.catch(() => undefined);
    return step;
  };

  const trigger = debounce(() => {
    void run().catch((caught: unknown) => {
      console.error(caught);
    });
  }, debounceMs);

  return {
    schedule(snapshot) {
      if (disposed) {
        return;
      }
      pending = snapshot;
      trigger();
    },
    async flush(snapshot) {
      if (disposed) {
        return;
      }
      if (snapshot) {
        pending = snapshot;
      }
      trigger.cancel();
      await run();
    },
    dispose() {
      disposed = true;
      pending = null;
      trigger.cancel();
    },
  };
}

/**
 * Persists the graph and the node positions after every change, debounced so a drag or multiple
 * form edits produce one write. Returns a flush function for actions that need the latest graph
 * to reach the backend before they continue.
 */
export function useAutosave(): () => Promise<void> {
  const queueRef = useRef<AutosaveQueue | null>(null);

  useEffect(() => {
    const initial = useEditorStore.getState();
    if (
      initial.loadState !== "ready" ||
      initial.resourceIri === null ||
      initial.graph === null
    ) {
      return;
    }

    let persisted = { graph: initial.graph, positions: initial.positions };
    const queue = createAutosaveQueue(async (snapshot) => {
      await persistSnapshot(snapshot);
      persisted = { graph: snapshot.graph, positions: snapshot.positions };
    }, initial.setSaveState);
    queueRef.current = queue;

    let observedGraph = initial.graph;
    let observedPositions = initial.positions;
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (
        state.loadState !== "ready" ||
        state.resourceIri === null ||
        state.graph === null ||
        (state.graph === observedGraph && state.positions === observedPositions)
      ) {
        return;
      }

      observedGraph = state.graph;
      observedPositions = state.positions;
      queue.schedule({
        resourceIri: state.resourceIri,
        graph: state.graph,
        positions: state.positions,
      });
    });

    // a debounced write would be lost when the tab goes away, so hiding it writes now
    const flushBeforeLeaving = () => {
      const { resourceIri, graph, positions } = useEditorStore.getState();
      if (resourceIri === null || graph === null) {
        return;
      }
      if (graph === persisted.graph && positions === persisted.positions) {
        return;
      }
      void queue.flush({ resourceIri, graph, positions }).catch((caught: unknown) => {
        console.error(caught);
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushBeforeLeaving();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushBeforeLeaving);

    return () => {
      if (queueRef.current === queue) {
        queueRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushBeforeLeaving);
      queue.dispose();
      unsubscribe();
    };
  }, []);

  return useCallback(async () => {
    const { resourceIri, graph, positions } = useEditorStore.getState();
    if (resourceIri === null || graph === null) {
      return;
    }

    const queue = queueRef.current;
    if (queue === null) {
      throw new Error("Autosave is not ready.");
    }
    await queue.flush({ resourceIri, graph, positions });
  }, []);
}

async function persistSnapshot(snapshot: AutosaveSnapshot): Promise<void> {
  await saveGraph(snapshot.resourceIri, snapshot.graph, snapshot.positions);
}
