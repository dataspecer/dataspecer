import { useState } from 'react';
import type { ApplicationGraph } from '@dataspecer/app-generator/graph';
import { generateApplication } from '@/backend/client.ts';
import { useViolationsBySeverity } from '@/hooks/use-validation.ts';
import { downloadBlob } from '@/utils/download-blob.ts';
import { errorMessage } from '@/utils/error-message.ts';
import { archiveFileName } from '@/graph/file-names.ts';
import { useEditorStore } from '@/store.ts';
import { shouldShowGenerateHelp } from '@/utils/generate-help.ts';
import { GenerateHelpDialog } from './generate-help-dialog.tsx';
import { countNoun } from '@/utils/count-noun.ts';

export function EditorHeader({
  graph,
  flushAutosave,
}: {
  graph: ApplicationGraph;
  /** Pushes pending autosave writes to the backend, used before generation. */
  flushAutosave: () => Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { errors, warnings } = useViolationsBySeverity();
  const empty = graph.nodes.length === 0;

  const generate = async () => {
    setGenerating(true);
    const { setActionError, setGenerationViolations } = useEditorStore.getState();
    setActionError(null);
    // the previous attempt says nothing about this one
    setGenerationViolations(null);
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
        if (shouldShowGenerateHelp()) {
          setHelpOpen(true);
        }
      } else {
        // some failures only show up on the server, such as metadata resolution
        setGenerationViolations(result.violations);
        useEditorStore.getState().setSidebarTab('problems');
        setActionError('Generation failed, see the problems panel.');
      }
    } catch (caught) {
      console.error(caught);
      setActionError(errorMessage(caught));
    } finally {
      setGenerating(false);
    }
  };

  // warnings do not block, but they are worth a look before the archive is downloaded
  const onGenerate = async () => {
    if (warnings.length > 0) {
      const confirmed = await useEditorStore.getState().requestConfirm({
        title: `Generate with ${countNoun(warnings.length, 'warning')}?`,
        message: 'The application may not work as expected.',
        details: warnings.map((violation) => violation.message),
        confirmLabel: 'Generate anyway',
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
        disabled={generating || empty || errors.length > 0}
        title={
          empty
            ? 'Add at least one node before generating.'
            : errors.length > 0
              ? `Generation is blocked by ${countNoun(errors.length, 'error')}.`
              : undefined
        }
      >
        {generating ? 'Generating...' : 'Generate application'}
      </button>
      <GenerateHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
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
