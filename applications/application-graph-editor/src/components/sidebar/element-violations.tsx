import { ViolationSeverity, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useViolations } from "../../hooks/use-violations.ts";
import { violationsFor } from "../../validation/violations.ts";
import { ViolationItem } from "./violation-item.tsx";

/**
 * Problems of one node or edge.
 */
export function ElementViolations({
  graph,
  kind,
  id,
}: {
  graph: ApplicationGraph;
  kind: "node" | "edge";
  id: string;
}) {
  const violations = violationsFor(graph, useViolations(graph), kind, id);
  if (violations.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-slate-100 pt-3">
      {violations.map((violation, index) => (
        <li
          key={index}
          className={`rounded border px-2 py-1 text-xs ${
            violation.severity === ViolationSeverity.Error
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <ViolationItem violation={violation} />
        </li>
      ))}
    </ul>
  );
}
