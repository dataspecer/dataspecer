import { useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { applicationGraphSchema, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { applyGraphJson } from "../graph/apply-json.ts";
import { useEditorStore } from "../store.ts";
import { liveViolations } from "../validation/violations.ts";
import { violationRanges } from "../validation/violation-ranges.ts";

const VIOLATION_MARKER_OWNER = "application-graph-violations";

function configureJsonLanguage(instance: Monaco) {
  instance.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: "inmemory://application-graph-schema.json",
        fileMatch: ["*"],
        schema: applicationGraphSchema,
      },
    ],
  });
}

/**
 * Synchronized JSON view of the edited graph. The text is editable and Apply makes it the edited graph after a syntax
 * check. Violations of the applied graph underline the parts their paths point at.
 */
export function JsonPanel({ graph }: { graph: ApplicationGraph }) {
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const json = useMemo(() => JSON.stringify(graph, null, 2), [graph]);
  const [draft, setDraft] = useState(json);
  const [baseline, setBaseline] = useState(json);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<{ editor: monaco.editor.IStandaloneCodeEditor; monaco: Monaco }>(null);
  // the editor mounts asynchronously, the marker effect has to run again once it is there
  const [editorMounted, setEditorMounted] = useState(false);

  // render-phase resync: when the graph changes elsewhere, an untouched draft follows it and
  // an edited draft is kept
  if (baseline !== json) {
    setBaseline(json);
    if (draft === baseline) {
      setDraft(json);
      setError(null);
    }
  }
  const dirty = draft !== json;

  // violations of the applied graph underline their JSON parts while the view is in sync, an
  // edited draft has shifted offsets and keeps only the schema diagnostics
  const violations = useMemo(
    () => [
      ...liveViolations(graph),
      ...(semanticValidation?.forGraph === graph ? semanticValidation.violations : []),
    ],
    [graph, semanticValidation],
  );

  useEffect(() => {
    const mounted = editorRef.current;
    const model = mounted?.editor.getModel();
    if (!mounted || !model) {
      return;
    }
    const markers = dirty
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

  const onMount: OnMount = (editor, instance) => {
    editorRef.current = { editor, monaco: instance };
    setEditorMounted(true);
  };

  const apply = () => {
    applyGraphJson(draft)
      .then((problem) => {
        setError(problem);
        if (problem === null) {
          // the draft may be formatted differently than the canonical serialization
          setDraft(JSON.stringify(useEditorStore.getState().graph, null, 2));
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        setError(caught instanceof Error ? caught.message : String(caught));
      });
  };

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-semibold text-slate-700">JSON</span>
        <button
          type="button"
          className="rounded px-2 text-slate-500 hover:bg-slate-100"
          onClick={() => setJsonPanelOpen(false)}
          aria-label="Close JSON panel"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          language="json"
          value={draft}
          onChange={(value) => setDraft(value ?? "")}
          beforeMount={configureJsonLanguage}
          onMount={onMount}
          options={{
            wordWrap: "on",
            minimap: { enabled: false },
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 11,
          }}
        />
      </div>
      {error && (
        <p className="border-t border-slate-200 px-3 py-1 text-xs text-red-700">{error}</p>
      )}
      {dirty && (
        <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
            onClick={apply}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
            onClick={() => {
              setDraft(json);
              setError(null);
            }}
          >
            Reset
          </button>
        </div>
      )}
    </aside>
  );
}
