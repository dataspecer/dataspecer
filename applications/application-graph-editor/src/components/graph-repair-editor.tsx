import { useCallback, useMemo, useRef, useState } from 'react';
import { loadPositions, saveGraphAndPositions } from '@/backend/client.ts';
import { GraphJsonEditor } from '@/components/graph-json-editor.tsx';
import { completeNodePositions } from '@/diagram/auto-layout.ts';
import { parseGraph } from '@/graph/parse-graph.ts';
import { useBeforeUnload } from '@/hooks/use-unload-warning.ts';
import { errorMessage } from '@/utils/error-message.ts';

interface GraphRepairEditorProps {
  resourceIri: string;
  storedValue: unknown;
}

/** Repairs a stored value before it is allowed into the typed graph editor. */
export function GraphRepairEditor({ resourceIri, storedValue }: GraphRepairEditorProps) {
  const [originalJson] = useState(() => JSON.stringify(storedValue, null, 2) ?? 'null');
  const [draft, setDraft] = useState(originalJson);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipUnloadWarning = useRef(false);
  const parsed = useMemo(() => parseGraph(draft), [draft]);
  const validationError = parsed.ok ? null : parsed.error;
  const dirty = draft !== originalJson;
  const shouldWarnBeforeUnload = useCallback(() => dirty && !skipUnloadWarning.current, [dirty]);

  useBeforeUnload(shouldWarnBeforeUnload);

  const save = async () => {
    if (!parsed.ok) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const storedPositions = (await loadPositions(resourceIri)) ?? {};
      const positions = await completeNodePositions(parsed.graph, storedPositions);
      await saveGraphAndPositions(resourceIri, parsed.graph, positions);
      skipUnloadWarning.current = true;
      window.location.reload();
    } catch (caught) {
      console.error(caught);
      setSaveError(errorMessage(caught));
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <header className="border-b border-slate-200 px-4 py-3">
        <h1 className="font-semibold text-slate-800">Repair application graph</h1>
        <p className="truncate text-sm text-slate-500" title={resourceIri}>
          {resourceIri}
        </p>
      </header>
      <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm">
        This resource is not a valid application graph. Correct the JSON below before opening it in
        the graph editor. The stored resource is unchanged until the corrected graph is saved.
      </div>
      <div className="min-h-0 flex-1">
        <GraphJsonEditor
          value={draft}
          onChange={(next) => {
            setDraft(next ?? '');
            setSaveError(null);
          }}
        />
      </div>
      {validationError && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {validationError}
        </p>
      )}
      {saveError && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          Failed to save: {saveError}
        </p>
      )}
      <footer className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={validationError !== null || saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save and open graph'}
        </button>
        {!dirty && <span className="text-sm text-slate-500">Edit the JSON to repair it.</span>}
      </footer>
    </div>
  );
}
