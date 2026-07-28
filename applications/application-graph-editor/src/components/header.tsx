import { useState } from "react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { generateApplication } from "../backend/client.ts";
import { useViolationsBySeverity } from "../hooks/use-validation.ts";
import { downloadBlob } from "../utils/download-blob.ts";
import { archiveFileName } from "../graph/file-names.ts";
import { useEditorStore } from "../store.ts";

export function EditorHeader({
  graph,
  flushAutosave,
}: {
  graph: ApplicationGraph;
  /** Pushes pending autosave writes to the backend, used before generation. */
  flushAutosave: () => Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const { errors, warnings } = useViolationsBySeverity();

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
        // only the backend knows some failures, such as metadata resolution
        useEditorStore.getState().setGenerationViolations({
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

  // warnings do not block, but they are worth a look before the archive is downloaded
  const onGenerate = async () => {
    if (warnings.length > 0) {
      const confirmed = await useEditorStore.getState().requestConfirm({
        title: `Generate with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}?`,
        message: "The application may not work as expected.",
        details: warnings.map((violation) => violation.message),
        confirmLabel: "Generate anyway",
      });
      if (!confirmed) {
        return;
      }
    }
    await generate();
  };

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
      <Branding />
      <div className="h-4 w-px bg-slate-200" />
      <h1 className="truncate text-sm font-semibold text-slate-800">{graph.name}</h1>
      <div className="grow" />
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        onClick={() => void onGenerate()}
        disabled={generating || errors.length > 0}
        title={
          errors.length > 0
            ? `${errors.length} error${errors.length === 1 ? "" : "s"} block generation`
            : undefined
        }
      >
        {generating ? "Generating..." : "Generate"}
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
    <a href={managerUrl} title="Back to the manager">
      {label}
    </a>
  );
}
