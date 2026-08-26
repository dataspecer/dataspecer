import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { applicationGraphSchema, type ApplicationGraph } from '@dataspecer/app-generator/graph';
import { applyGraphJson } from '@/graph/apply-json.ts';
import { graphElementAtOffset } from '@/graph/json-cursor.ts';
import { useEditorStore } from '@/store.ts';
import { useValidation } from '@/hooks/use-validation.ts';
import { violationRanges } from '@/validation/violation-ranges.ts';
import { errorMessage } from '@/utils/error-message.ts';

const VIOLATION_MARKER_OWNER = 'application-graph-violations';

function configureJsonLanguage(instance: Monaco) {
  instance.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        // registering under the real $id also resolves an inline "$schema" reference in a
        // pasted graph, which would otherwise fail because schema requests are disabled
        uri: applicationGraphSchema.$id,
        fileMatch: ['*'],
        schema: applicationGraphSchema,
      },
    ],
  });
}

/**
 * Synchronized JSON view of the edited graph.
 */
export function JsonPanel({ graph }: { graph: ApplicationGraph }) {
  const json = useMemo(() => JSON.stringify(graph, null, 2), [graph]);
  // an untouched view follows the graph, an edited draft stays as it is until applied or reset
  const setDraft = useEditorStore((state) => state.setJsonDraft);
  const editing = useEditorStore((state) => state.jsonDraft);
  const draft = editing?.text ?? json;
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<{ editor: monaco.editor.IStandaloneCodeEditor; monaco: Monaco }>(null);
  // the editor mounts asynchronously, the marker effect has to run again once it is there
  const [editorMounted, setEditorMounted] = useState(false);

  const dirty = draft !== json;
  // the graph moved on while the draft waited, so applying it drops whatever happened meanwhile
  const stale = editing !== null && editing.base !== json;

  // Violations underline their JSON parts while the text matches the graph they were computed
  // from. An edited draft, or a graph changed since that validation, has shifted the offsets, so
  // only the schema diagnostics remain.
  const validation = useValidation();
  const violations = validation?.graph === graph ? validation.violations : null;

  useEffect(() => () => useEditorStore.getState().setHighlight(null), []);

  useEffect(() => {
    const mounted = editorRef.current;
    const model = mounted?.editor.getModel();
    if (!mounted || !model) {
      return;
    }
    const markers =
      dirty || violations === null
        ? []
        : violationRanges(json, violations).map((range) => {
            const start = model.getPositionAt(range.start);
            const end = model.getPositionAt(range.end);
            return {
              severity: mounted.monaco.MarkerSeverity.Error,
              message: `${range.code}: ${range.message}`,
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            };
          });
    mounted.monaco.editor.setModelMarkers(model, VIOLATION_MARKER_OWNER, markers);
  }, [json, violations, dirty, editorMounted]);

  // the ID comes from the text, which may be an edited draft, so it counts only while the applied
  // graph still holds that ID
  const elementAtCursor = (text: string, offset: number) => {
    const target = graphElementAtOffset(text, offset);
    if (target === null) {
      return null;
    }
    const { graph: current } = useEditorStore.getState();
    const exists =
      target.kind === 'node'
        ? current?.nodes.some((node) => node.id === target.id)
        : current?.edges.some((edge) => edge.id === target.id);
    return exists ? target : null;
  };

  const apply = useCallback(() => {
    const currentDraft = useEditorStore.getState().jsonDraft;
    if (currentDraft === null) {
      return;
    }
    applyGraphJson(currentDraft.text)
      .then((result) => {
        setError(result.error);
        if (result.applied) {
          // the view follows the graph again, which also reformats a differently written draft
          setDraft(null);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        setError(errorMessage(caught));
      });
  }, [setDraft]);

  const onMount: OnMount = (editor, instance) => {
    editorRef.current = { editor, monaco: instance };
    setEditorMounted(true);
    // Ctrl+S applies the draft
    editor.addCommand(instance.KeyMod.CtrlCmd | instance.KeyCode.KeyS, apply);
    // The cursor highlights its element on the canvas, and a click also brings it into view.
    // Keyboard moves only highlight, so typing does not pan the canvas.
    editor.onDidChangeCursorPosition((event) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      const target = elementAtCursor(model.getValue(), model.getOffsetAt(event.position));
      const store = useEditorStore.getState();
      store.setHighlight(target);
      if (target !== null && event.source === 'mouse') {
        store.requestFocus(target.id);
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <MonacoEditor
          language="json"
          value={draft}
          onChange={(value) => setDraft({ text: value ?? '', base: editing?.base ?? json })}
          beforeMount={configureJsonLanguage}
          onMount={onMount}
          options={{
            wordWrap: 'on',
            minimap: { enabled: false },
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 13,
          }}
        />
      </div>
      {error && <p className="border-t border-slate-200 px-3 py-1 text-sm text-red-700">{error}</p>}
      {dirty && stale && (
        <p className="border-t border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800">
          The graph changed since this draft was last modified. Applying it drops those changes.
        </p>
      )}
      {dirty && (
        <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            onClick={apply}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
