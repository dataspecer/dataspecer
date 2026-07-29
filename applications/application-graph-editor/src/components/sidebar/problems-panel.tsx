import type { ApplicationGraph, Violation } from "@dataspecer/app-generator/graph";
import { useValidation, useViolationsBySeverity } from "../../hooks/use-validation.ts";
import { useEditorStore } from "../../store.ts";
import { violationTarget } from "../../validation/violations.ts";
import { ViolationItem } from "./violation-item.tsx";

/**
 * The sidebar tab listing the current violations. Everything except metadata resolution is
 * checked in the editor, so the list follows every change. Clicking a problem selects the
 * offending node or edge and brings it into view.
 */
export function ProblemsPanel({ graph }: { graph: ApplicationGraph }) {
  const metadata = useEditorStore((state) => state.metadata);
  const validation = useValidation();
  const { errors, warnings } = useViolationsBySeverity();
  // violation paths are indexes, so they resolve against the graph they were computed from
  const validated = validation?.graph ?? graph;

  const focusProblem = (violation: Violation) => {
    const store = useEditorStore.getState();
    const target = violationTarget(validated, violation);
    if (target === null) {
      store.setSidebarTab("json");
      return;
    }
    store.requestSelect(target.id);
    store.requestFocus(target.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {metadata === null && (
        <p className="border-b border-slate-100 px-3 py-2 text-sm text-slate-400">
          Data structure checks need the specification metadata, which is unavailable.
        </p>
      )}
      {errors.length === 0 && warnings.length === 0 ? (
        <p className="px-3 py-2 text-sm text-slate-400">No problems found.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <ViolationGroup
            title="Errors"
            violations={errors}
            graph={validated}
            onFocus={focusProblem}
          />
          <ViolationGroup
            title="Warnings"
            violations={warnings}
            graph={validated}
            onFocus={focusProblem}
          />
        </div>
      )}
    </div>
  );
}

function ViolationGroup({
  title,
  violations,
  graph,
  onFocus,
}: {
  title: string;
  violations: Violation[];
  graph: ApplicationGraph;
  onFocus: (violation: Violation) => void;
}) {
  if (violations.length === 0) {
    return null;
  }

  return (
    <section className="mb-2">
      <h3 className="px-3 py-1 text-sm font-medium text-slate-600">
        {title} ({violations.length})
      </h3>
      <ul className="px-1">
        {violations.map((violation, index) => {
          const target = violationTarget(graph, violation);
          return (
            <li key={index}>
              <button
                type="button"
                className="w-full cursor-pointer rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                onClick={() => onFocus(violation)}
              >
                <ViolationItem violation={violation} heading={target ? target.id : "Graph"} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
