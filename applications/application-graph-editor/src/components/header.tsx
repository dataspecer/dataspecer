import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { generateApplication } from "../backend/client.ts";
import { useViolationsBySeverity } from "../hooks/use-violations.ts";
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
  const [confirming, setConfirming] = useState(false);
  const { errors, warnings } = useViolationsBySeverity(graph);

  const generate = async () => {
    setConfirming(false);
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
  const onGenerate = () => {
    if (errors.length === 0 && warnings.length > 0) {
      setConfirming(true);
    } else {
      void generate();
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
        onClick={onGenerate}
        disabled={generating || errors.length > 0}
        title={
          errors.length > 0
            ? `${errors.length} error${errors.length === 1 ? "" : "s"} block generation`
            : undefined
        }
      >
        {generating ? "Generating..." : "Generate"}
      </button>
      <WarningsDialog
        open={confirming}
        warnings={warnings.map((violation) => violation.message)}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void generate()}
      />
    </header>
  );
}

function WarningsDialog({
  open,
  warnings,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  warnings: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[32rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <Dialog.Title className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle size={15} className="text-amber-600" />
            Generate with {warnings.length} warning{warnings.length === 1 ? "" : "s"}?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-slate-500">
            The application may not work as expected.
          </Dialog.Description>
          <ul className="mt-3 max-h-56 list-disc overflow-y-auto pl-5 text-xs text-slate-700">
            {warnings.map((message, index) => (
              <li key={index} className="mb-1">
                {message}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              onClick={onConfirm}
            >
              Generate anyway
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
