import { useMemo } from "react";
import {
  validateGraphStructure,
  validateGraphSyntax,
  type ApplicationGraph,
  type Violation,
} from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";

/**
 * Synchronized JSON view of the edited graph with the validity indicator. Syntax and structural validation run client
 * side through the generator package, so the rules stay single sourced. Semantic validation requires specification
 * metadata and is not performed here.
 */
export function JsonPanel({ graph }: { graph: ApplicationGraph }) {
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);

  const violations = useMemo<Violation[]>(() => {
    const syntax = validateGraphSyntax(graph);
    if (!syntax.valid) {
      return syntax.violations;
    }
    return validateGraphStructure(graph).violations;
  }, [graph]);

  const json = useMemo(() => JSON.stringify(graph, null, 2), [graph]);

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
      <pre className="min-h-0 flex-1 overflow-auto px-3 py-2 text-xs leading-relaxed text-slate-800">
        {json}
      </pre>
      <div className="border-t border-slate-200 px-3 py-2 text-sm">
        {violations.length === 0 ? (
          <span className="text-green-700">✓ Valid (syntax and structure)</span>
        ) : (
          <span className="text-red-700" title={violations.map((v) => v.message).join("\n")}>
            ✗ {violations.length} violation{violations.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </aside>
  );
}
