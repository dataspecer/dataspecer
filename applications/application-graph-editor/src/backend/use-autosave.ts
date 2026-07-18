import { useEffect } from "react";
import { debounce } from "es-toolkit";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore, type NodePositions } from "../store.ts";
import { saveGraph } from "./client.ts";

const SAVE_DEBOUNCE_MS = 800;

type Snapshot = { graph: ApplicationGraph; positions: NodePositions };

/**
 * Persists the graph and the node positions after every change, debounced so a drag or multiple form edits produce one
 * write.
 */
export function useAutosave(): void {
  useEffect(() => {
    let lastSaved: Snapshot | null = null;

    const save = debounce((snapshot: Snapshot) => {
      const { resourceIri, setSaveState } = useEditorStore.getState();
      if (resourceIri === null) {
        return;
      }
      setSaveState("saving");
      saveGraph(resourceIri, snapshot.graph, snapshot.positions)
        .then(() => {
          lastSaved = snapshot;
          setSaveState("saved");
        })
        .catch((caught: unknown) => {
          console.error(caught);
          setSaveState("error");
        });
    }, SAVE_DEBOUNCE_MS);

    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.loadState !== "ready" || state.graph === null) {
        return;
      }
      if (lastSaved === null) {
        // first ready snapshot is the state that was just read from the backend
        lastSaved = { graph: state.graph, positions: state.positions };
        return;
      }
      if (state.graph === lastSaved.graph && state.positions === lastSaved.positions) {
        return;
      }
      save({ graph: state.graph, positions: state.positions });
    });

    return () => {
      save.cancel();
      unsubscribe();
    };
  }, []);
}
