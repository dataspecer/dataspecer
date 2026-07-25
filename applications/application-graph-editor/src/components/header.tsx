import { useState } from "react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { generateApplication } from "../backend/client.ts";
import { downloadBlob } from "../utils/download-blob.ts";
import { archiveFileName } from "../graph/file-names.ts";
import { useEditorStore } from "../store.ts";

export interface EditorHeaderProps {
  graph: ApplicationGraph;
  /** Pushes pending autosave writes to the backend, used before generation. */
  flushAutosave: () => Promise<void>;
}

export function EditorHeader({ graph, flushAutosave }: EditorHeaderProps) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const { setActionError } = useEditorStore.getState();
    setActionError(null);
    try {
      // the endpoint reads the saved blob, so flush pending writes before requesting generation
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
        useEditorStore.getState().setSidebarTab("problems");
        setActionError("Generation failed, see the problems panel.");
      }
    } catch (caught) {
      console.error(caught);
      const { setActionError: report } = useEditorStore.getState();
      report(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
      <Branding />
      <div className="h-4 w-px bg-slate-200" />
      <h1 className="truncate text-sm font-semibold text-slate-800">{graph.name}</h1>
      <div className="grow" />
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        onClick={() => void generate()}
        disabled={generating}
      >
        {generating ? "Generating…" : "Generate"}
      </button>
    </header>
  );
}

function Branding() {
  const label = (
    <span className="whitespace-nowrap text-sm text-slate-700">
      <strong>Dataspecer</strong> graph editor
    </span>
  );
  const managerUrl = import.meta.env.VITE_MANAGER as string | undefined;
  if (!managerUrl) {
    return label;
  }
  return (
    <a href={managerUrl} title="Back to the manager" className="hover:underline">
      {label}
    </a>
  );
}
