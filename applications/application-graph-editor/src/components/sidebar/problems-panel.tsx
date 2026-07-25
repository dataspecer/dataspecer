import { useMemo, useState } from "react";
import type { ApplicationGraph, Violation } from "@dataspecer/app-generator/graph";
import { runSemanticValidation } from "../../backend/run-validation.ts";
import { useEditorStore } from "../../store.ts";
import { combinedViolations, violationTarget } from "../../validation/violations.ts";
import { ToolbarButton } from "../toolbar-button.tsx";

/**
 * The sidebar tab listing the current violations. Syntax and structural problems refresh with every change. Semantic
 * problems come from the backend on demand and are marked outdated once the graph changes, because they were computed
 * for an older snapshot.
 */
export function ProblemsPanel({ graph }: { graph: ApplicationGraph }) {
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const [validating, setValidating] = useState(false);

  const problems = useMemo(
    () => combinedViolations(graph, semanticValidation),
    [graph, semanticValidation],
  );
  const semanticStale = semanticValidation !== null && semanticValidation.forGraph !== graph;

  const runValidation = () => {
    setValidating(true);
    runSemanticValidation(graph)
      .catch((caught: unknown) => {
        console.error(caught);
      })
      .finally(() => setValidating(false));
  };

  const focusProblem = (violation: Violation) => {
    const target = violationTarget(graph, violation);
    if (target) {
      const store = useEditorStore.getState();
      store.setSelection(target);
      store.requestFocus(target.id);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        {semanticStale && (
          <span className="text-xs text-amber-700">semantic results outdated, validate again</span>
        )}
        {semanticValidation === null && (
          <span className="text-xs text-slate-400">semantic checks not run yet</span>
        )}
        <div className="grow" />
        <ToolbarButton onClick={runValidation} disabled={validating}>
          {validating ? "Validating…" : "Validate"}
        </ToolbarButton>
      </div>
      {problems.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400">No problems found.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {problems.map((violation, index) => {
            const focusable = violationTarget(graph, violation) !== null;
            return (
              <li key={index}>
                <button
                  type="button"
                  className={`w-full rounded px-2 py-1 text-left text-xs text-slate-700 ${
                    focusable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                  }`}
                  onClick={() => focusProblem(violation)}
                >
                  <span className="font-medium text-red-700">{violation.code}</span>
                  {violation.path && <span className="text-slate-400"> {violation.path}</span>}
                  <span className="block">{violation.message}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
