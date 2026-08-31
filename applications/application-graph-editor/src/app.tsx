import { useEffect, useState, type ReactNode } from 'react';
import { type ApplicationGraph } from '@dataspecer/app-generator/graph';
import { loadGraph, loadMetadata, loadPositions } from './backend/client.ts';
import { ConfirmDialog } from './components/confirm-dialog.tsx';
import { GraphRepairEditor } from './components/graph-repair-editor.tsx';
import { EditorHeader } from './components/header.tsx';
import { Sidebar } from './components/sidebar/sidebar.tsx';
import { StatusBar } from './components/status-bar.tsx';
import { autoLayout } from './diagram/auto-layout.ts';
import { Canvas } from './diagram/canvas.tsx';
import { useAutosave } from './hooks/use-autosave.ts';
import { useSaveShortcut } from './hooks/use-save-shortcut.ts';
import { useUnloadWarning } from './hooks/use-unload-warning.ts';
import { useValidationSync } from './hooks/use-validation.ts';
import { useUndoRedoShortcuts } from './hooks/use-undo-redo-shortcuts.ts';
import { useEditorStore, type NodePositions } from './store.ts';
import { errorMessage } from '@/utils/error-message.ts';

export function App() {
  const resourceIri = new URLSearchParams(window.location.search).get('iri');
  const loadState = useEditorStore((state) => state.loadState);
  const loadError = useEditorStore((state) => state.loadError);
  const graph = useEditorStore((state) => state.graph);
  const [repairValue, setRepairValue] = useState<unknown>();

  useEffect(() => {
    if (!resourceIri) {
      useEditorStore.getState().failLoad('Missing the ?iri query parameter.');
      return;
    }

    let active = true;
    (async () => {
      const loaded = await loadGraph(resourceIri);
      if (loaded.kind === 'invalid') {
        if (active) {
          setRepairValue(loaded.invalidValue);
        }
        return;
      }
      const positions = (await loadPositions(resourceIri)) ?? (await initialLayout(loaded.graph));
      if (active) {
        useEditorStore.getState().initialize(resourceIri, loaded.graph, positions);
        // loading is not undoable
        useEditorStore.temporal.getState().clear();
      }
    })().catch((caught: unknown) => {
      console.error(caught);
      if (active) {
        useEditorStore.getState().failLoad(errorMessage(caught));
      }
    });
    return () => {
      active = false;
    };
  }, [resourceIri]);

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
          const message = errorMessage(caught);
          useEditorStore
            .getState()
            .failMetadata(`Failed to load the data structures of the specification: ${message}`);
        }
      });
    return () => {
      active = false;
    };
  }, [dataSpecificationIri]);

  if (repairValue !== undefined && resourceIri !== null) {
    return <GraphRepairEditor resourceIri={resourceIri} storedValue={repairValue} />;
  }
  if (loadState === 'loading') {
    return <Centered>Loading application graph...</Centered>;
  }
  if (loadState === 'error' || graph === null) {
    return <Centered>{loadError ?? 'Failed to load the application graph.'}</Centered>;
  }
  return <Editor graph={graph} />;
}

async function initialLayout(graph: ApplicationGraph): Promise<NodePositions> {
  try {
    return await autoLayout(graph);
  } catch (caught) {
    console.error(caught);
    return {};
  }
}

function Editor({ graph }: { graph: ApplicationGraph }) {
  const flushAutosave = useAutosave();
  useSaveShortcut(flushAutosave);
  useUndoRedoShortcuts();
  useValidationSync();
  useUnloadWarning();

  const metadataError = useEditorStore((state) => state.metadataError);
  const actionError = useEditorStore((state) => state.actionError);
  const saveState = useEditorStore((state) => state.saveState);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EditorHeader graph={graph} flushAutosave={flushAutosave} />
      {actionError && (
        <button
          type="button"
          className="border-b border-red-200 bg-red-50 px-4 py-1 text-left text-sm text-red-700"
          title="Dismiss"
          onClick={() => useEditorStore.getState().setActionError(null)}
        >
          {actionError}
        </button>
      )}
      {saveState === 'invalid' && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-1 text-sm text-amber-800"
        >
          Not saved: invalid graph syntax, see the problems panel.
        </div>
      )}
      {metadataError && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-1 text-sm text-amber-800"
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
      <StatusBar />
      <ConfirmDialog />
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-600">{children}</div>
  );
}
