import { useEffect } from "react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore, type NodePositions } from "../store.ts";
import { saveGraph } from "./client.ts";

const SAVE_DEBOUNCE_MS = 800;

/**
 * Persists the graph and the node positions after every change, debounced so a drag or multiple form edits produce one
 * write.
 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSaved: { graph: ApplicationGraph; positions: NodePositions } | null = null;

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

      const snapshot = { graph: state.graph, positions: state.positions };
      clearTimeout(timer);
      timer = setTimeout(() => {
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
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
