import { useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { Operation, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { generateApplication } from "../backend/client.ts";
import { autoLayout } from "../diagram/auto-layout.ts";
import { applyGraphJson } from "../graph/apply-json.ts";
import { archiveFileName, exportFileName } from "../graph/file-names.ts";
import { nextNodeId } from "../graph/mutations.ts";
import { useEditorStore, type SaveState } from "../store.ts";

export interface EditorHeaderProps {
  graph: ApplicationGraph;
  /** Pushes pending autosave writes to the backend, used before generation. */
  flushAutosave: () => Promise<void>;
}

/** The toolbar with the graph actions, plus the dismissible error strip below it. */
export function EditorHeader({ graph, flushAutosave }: EditorHeaderProps) {
  const { undo, redo, pastStates, futureStates } = useStore(useEditorStore.temporal);
  const saveState = useEditorStore((state) => state.saveState);
  const jsonPanelOpen = useEditorStore((state) => state.jsonPanelOpen);
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const setSettingsOpen = useEditorStore((state) => state.setSettingsOpen);
  const importInput = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const importFile = async (file: File) => {
    const problem = await applyGraphJson(await file.text());
    setActionError(problem && `Import failed: ${problem}`);
  };

  const exportGraph = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    downloadBlob(blob, exportFileName(graph));
  };

  const generate = async () => {
    setGenerating(true);
    setActionError(null);
    try {
      // The endpoint reads the saved blob, so flush pending writes before requesting generation.
      const { resourceIri, graph: current } = useEditorStore.getState();
      if (resourceIri === null || current === null) {
        return;
      }
      await flushAutosave();
      const result = await generateApplication(resourceIri);
      if (result.ok) {
        downloadBlob(result.archive, archiveFileName(current));
      } else {
        // generation violations land in the problems panel like a validation run
        useEditorStore.getState().setSemanticValidation({
          violations: result.violations,
          forGraph: current,
        });
        setActionError("Generation failed, see the problems panel.");
      }
    } catch (caught) {
      console.error(caught);
      setActionError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setGenerating(false);
    }
  };

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
    <>
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
        <HeaderButton onClick={() => importInput.current?.click()}>Import</HeaderButton>
        <HeaderButton onClick={exportGraph}>Export</HeaderButton>
        <HeaderButton onClick={() => void generate()} disabled={generating}>
          {generating ? "Generating…" : "Generate"}
        </HeaderButton>
        <HeaderButton onClick={() => setSettingsOpen(!settingsOpen)}>Settings</HeaderButton>
        <HeaderButton onClick={() => setJsonPanelOpen(!jsonPanelOpen)}>JSON</HeaderButton>
        <input
          ref={importInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // the same file can be picked again after an undo
            event.target.value = "";
            if (file) {
              void importFile(file);
            }
          }}
        />
      </header>
      {actionError && (
        <button
          type="button"
          className="border-b border-red-200 bg-red-50 px-4 py-1 text-left text-xs text-red-700"
          title="Dismiss"
          onClick={() => setActionError(null)}
        >
          {actionError}
        </button>
      )}
    </>
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
