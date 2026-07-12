import { useEffect, type ReactNode } from "react";
import { useStore } from "zustand";
import { Operation, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { loadGraph, loadMetadata, loadPositions } from "./backend/client.ts";
import { useAutosave } from "./backend/use-autosave.ts";
import { Inspector } from "./components/inspector.tsx";
import { autoLayout } from "./diagram/auto-layout.ts";
import { Canvas } from "./diagram/canvas.tsx";
import { nextNodeId } from "./graph/mutations.ts";
import { useEditorStore, type SaveState } from "./store.ts";

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
          useEditorStore.getState().setMetadata(null);
        }
      });
    return () => {
      active = false;
    };
  }, [dataSpecificationIri]);

  if (loadState === "loading") {
    return <Centered>Loading application graph…</Centered>;
  }
  if (loadState === "error" || graph === null) {
    return <Centered>{loadError ?? "Failed to load the application graph."}</Centered>;
  }
  return <Editor graph={graph} />;
}

function Editor({ graph }: { graph: ApplicationGraph }) {
  useUndoRedoShortcuts();

  const { undo, redo, pastStates, futureStates } = useStore(useEditorStore.temporal);
  const saveState = useEditorStore((state) => state.saveState);
  const jsonPanelOpen = useEditorStore((state) => state.jsonPanelOpen);
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const setSettingsOpen = useEditorStore((state) => state.setSettingsOpen);

  const addNode = () => {
    const { graph: current, metadata } = useEditorStore.getState();
    if (current === null) {
      return;
    }
    const aggregate = metadata?.aggregates[0];
    const operation = Operation.ReadList;
    const id = nextNodeId(current, aggregate?.name ?? "node", operation);
    // keep freshly added nodes from covering each other
    const offset = (current.nodes.length % 6) * 36;
    useEditorStore.getState().addNode(
      { id, aggregateIri: aggregate?.iri ?? "", operation },
      { x: 60 + offset, y: 60 + offset },
    );
  };

  const relayout = async () => {
    const { graph: current, setAllPositions } = useEditorStore.getState();
    if (current !== null) {
      setAllPositions(await autoLayout(current));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <h1 className="text-sm font-semibold text-slate-800">{graph.name}</h1>
        <span className="text-xs text-slate-400">application graph</span>
        <SaveIndicator state={saveState} />
        <div className="grow" />
        <HeaderButton onClick={addNode}>Add node</HeaderButton>
        <HeaderButton onClick={() => void relayout()}>Layout</HeaderButton>
        <HeaderButton onClick={() => undo()} disabled={pastStates.length === 0}>
          Undo
        </HeaderButton>
        <HeaderButton onClick={() => redo()} disabled={futureStates.length === 0}>
          Redo
        </HeaderButton>
        <HeaderButton onClick={() => setSettingsOpen(!settingsOpen)}>Settings</HeaderButton>
        <HeaderButton onClick={() => setJsonPanelOpen(!jsonPanelOpen)}>JSON</HeaderButton>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Canvas />
        </div>
        <Inspector graph={graph} />
      </div>
    </div>
  );
}

function useUndoRedoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      // text inputs keep their native undo
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      const temporal = useEditorStore.temporal.getState();
      if (event.shiftKey) {
        temporal.redo();
      } else {
        temporal.undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-600">
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return <span className="text-xs text-slate-400">Saving…</span>;
  }
  if (state === "error") {
    return <span className="text-xs text-red-600">Save failed</span>;
  }
  return <span className="text-xs text-green-700">Auto-saved ✓</span>;
}

function HeaderButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
