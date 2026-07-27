import { useEffect, type ReactNode } from "react";
import { type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { loadGraph, loadMetadata, loadPositions } from "./backend/client.ts";
import { EditorHeader } from "./components/header.tsx";
import { Sidebar } from "./components/sidebar/sidebar.tsx";
import { StatusBar } from "./components/status-bar.tsx";
import { autoLayout } from "./diagram/auto-layout.ts";
import { Canvas } from "./diagram/canvas.tsx";
import { useAutosave } from "./hooks/use-autosave.ts";
import { useUndoRedoShortcuts } from "./hooks/use-undo-redo-shortcuts.ts";
import { useEditorStore } from "./store.ts";

export function App() {
  const loadState = useEditorStore((state) => state.loadState);
  const loadError = useEditorStore((state) => state.loadError);
  const graph = useEditorStore((state) => state.graph);

  useEffect(() => {
    const iri = new URLSearchParams(window.location.search).get("iri");
    if (!iri) {
      useEditorStore.getState().failLoad("Missing the ?iri query parameter.");
      return;
    }

    let active = true;
    (async () => {
      const loaded = await loadGraph(iri);
      const positions = (await loadPositions(iri)) ?? (await autoLayout(loaded));
      if (active) {
        useEditorStore.getState().initialize(iri, loaded, positions);
        // loading is not undoable
        useEditorStore.temporal.getState().clear();
      }
    })().catch((caught: unknown) => {
      console.error(caught);
      if (active) {
        useEditorStore
          .getState()
          .failLoad(caught instanceof Error ? caught.message : String(caught));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const dataSpecificationIri = graph?.dataSpecificationIri;
  useEffect(() => {
    useEditorStore.getState().setMetadata(null);
    if (!dataSpecificationIri) {
      return;
    }
    let active = true;
    loadMetadata(dataSpecificationIri)
      .then((metadata) => {
        if (active) {
          useEditorStore.getState().setMetadata(metadata);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          const message = caught instanceof Error ? caught.message : String(caught);
          useEditorStore.getState().failMetadata(`Failed to load aggregate metadata: ${message}`);
        }
      });
    return () => {
      active = false;
    };
  }, [dataSpecificationIri]);

  if (loadState === "loading") {
    return <Centered>Loading application graph...</Centered>;
  }
  if (loadState === "error" || graph === null) {
    return <Centered>{loadError ?? "Failed to load the application graph."}</Centered>;
  }
  return <Editor graph={graph} />;
}

function Editor({ graph }: { graph: ApplicationGraph }) {
  const flushAutosave = useAutosave();
  useUndoRedoShortcuts();

  const metadataError = useEditorStore((state) => state.metadataError);
  const actionError = useEditorStore((state) => state.actionError);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EditorHeader graph={graph} flushAutosave={flushAutosave} />
      {actionError && (
        <button
          type="button"
          className="border-b border-red-200 bg-red-50 px-4 py-1 text-left text-xs text-red-700"
          title="Dismiss"
          onClick={() => useEditorStore.getState().setActionError(null)}
        >
          {actionError}
        </button>
      )}
      {metadataError && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-1 text-xs text-amber-800"
        >
          {metadataError}
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Canvas />
        </div>
        <Sidebar graph={graph} />
      </div>
      <StatusBar graph={graph} />
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-600">
      {children}
    </div>
  );
}
