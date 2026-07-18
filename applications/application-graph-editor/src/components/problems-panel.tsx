import { useMemo, useState } from "react";
import { differenceBy } from "es-toolkit";
import type { ApplicationGraph, Violation } from "@dataspecer/app-generator/graph";
import { validateGraph } from "../backend/client.ts";
import { useEditorStore } from "../store.ts";
import { liveViolations, violationTarget } from "../validation/violations.ts";

function violationKey(violation: Violation): string {
  return `${violation.code}|${violation.path ?? ""}|${violation.message}`;
}

/**
 * A panel listing the current violations. Syntax and structural problems refresh with
 * every change. Semantic problems come from the backend on demand and are marked outdated once
 * the graph changes, because they were computed for an older snapshot. Clicking a problem
 * selects the offending node or edge and brings it into view.
 */
export function ProblemsPanel({ graph }: { graph: ApplicationGraph }) {
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const [expanded, setExpanded] = useState(false);
  const [validating, setValidating] = useState(false);

  const live = useMemo(() => liveViolations(graph), [graph]);
  const semanticFresh = semanticValidation !== null && semanticValidation.forGraph === graph;
  const semanticStale = semanticValidation !== null && !semanticFresh;
  const problems = useMemo(() => {
    // the backend runs the same syntax and structural rules, so its copies of the violations
    // already shown live are dropped
    const semantic = semanticFresh
      ? differenceBy(semanticValidation.violations, live, violationKey)
      : [];
    return [...live, ...semantic];
  }, [live, semanticFresh, semanticValidation]);

  const runValidation = () => {
    setValidating(true);
    validateGraph(graph)
      .then((result) => {
        useEditorStore.getState().setSemanticValidation({
          violations: result.violations,
          forGraph: graph,
        });
        setExpanded(result.violations.length > 0);
      })
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
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-1.5">
        <button
          type="button"
          className="text-xs text-slate-600 hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {problems.length === 0
            ? "✓ No problems"
            : `✗ ${problems.length} problem${problems.length === 1 ? "" : "s"}`}
        </button>
        {semanticStale && (
          <span className="text-xs text-amber-700">semantic results outdated</span>
        )}
        {semanticValidation === null && (
          <span className="text-xs text-slate-400">semantic checks not run yet</span>
        )}
        <div className="grow" />
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          onClick={runValidation}
          disabled={validating}
        >
          {validating ? "Validating…" : "Validate"}
        </button>
      </div>
      {expanded && problems.length > 0 && (
        <ul className="max-h-40 overflow-y-auto border-t border-slate-100 px-4 py-1">
          {problems.map((violation, index) => {
            const focusable = violationTarget(graph, violation) !== null;
            return (
              <li key={index}>
                <button
                  type="button"
                  className={`w-full truncate py-0.5 text-left text-xs text-slate-700 ${
                    focusable ? "hover:bg-slate-50" : "cursor-default"
                  }`}
                  title={`${violation.code}\n${violation.message}`}
                  onClick={() => focusProblem(violation)}
                >
                  <span className="text-red-700">{violation.code}</span>
                  {violation.path && <span className="text-slate-400"> {violation.path}</span>}
                  <span> {violation.message}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
