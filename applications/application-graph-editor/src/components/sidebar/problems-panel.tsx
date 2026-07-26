import { useMemo, useState } from "react";
import type { ApplicationGraph, Violation } from "@dataspecer/app-generator/graph";
import { runSemanticValidation } from "../../backend/run-validation.ts";
import { useEditorStore } from "../../store.ts";
import { bySeverity, combinedViolations, violationTarget } from "../../validation/violations.ts";
import { ToolbarButton } from "../toolbar-button.tsx";

/**
 * The sidebar tab listing the current violations. Syntax and structural problems refresh with every change. Semantic
 * problems come from the backend on demand and are marked outdated once the graph changes, because they were computed
 * for an older snapshot.
 */
export function ProblemsPanel({ graph }: { graph: ApplicationGraph }) {
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const [validating, setValidating] = useState(false);

  const { errors, warnings } = useMemo(
    () => bySeverity(combinedViolations(graph, semanticValidation)),
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
          {validating ? "Checking…" : "Run full check"}
        </ToolbarButton>
      </div>
      {errors.length === 0 && warnings.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400">No problems found.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <ViolationGroup
            title="Errors"
            note="app cannot be generated"
            violations={errors}
            codeClass="text-red-700"
            graph={graph}
            onFocus={focusProblem}
          />
          <ViolationGroup
            title="Warnings"
            note="generated app may not work as expected"
            violations={warnings}
            codeClass="text-amber-700"
            graph={graph}
            onFocus={focusProblem}
          />
        </div>
      )}
    </div>
  );
}

function ViolationGroup({
  title,
  note,
  violations,
  codeClass,
  graph,
  onFocus,
}: {
  title: string;
  note: string;
  violations: Violation[];
  codeClass: string;
  graph: ApplicationGraph;
  onFocus: (violation: Violation) => void;
}) {
  if (violations.length === 0) {
    return null;
  }

  return (
    <section className="mb-2">
      <h3 className="px-3 py-1 text-xs font-medium text-slate-600">
        {title} ({violations.length})
        <span className="ml-1 font-normal text-slate-400">{note}</span>
      </h3>
      <ul className="px-1">
        {violations.map((violation, index) => {
          const focusable = violationTarget(graph, violation) !== null;
          return (
            <li key={index}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1 text-left text-xs text-slate-700 ${
                  focusable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                }`}
                onClick={() => onFocus(violation)}
              >
                <span className={`font-medium ${codeClass}`}>{violation.code}</span>
                {violation.path && <span className="text-slate-400"> {violation.path}</span>}
                <span className="block">{violation.message}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
