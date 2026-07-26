import { useMemo } from "react";
import type { ApplicationGraph, Violation } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { bySeverity, combinedViolations, type ViolationsBySeverity } from "../validation/violations.ts";

/** The violations of the current graph, recomputed whenever the graph or the metadata changes. */
export function useViolations(graph: ApplicationGraph | null): Violation[] {
  const metadata = useEditorStore((state) => state.metadata);
  const generationViolations = useEditorStore((state) => state.generationViolations);

  return useMemo(
    () => (graph === null ? [] : combinedViolations(graph, metadata, generationViolations)),
    [graph, metadata, generationViolations],
  );
}

/** The violations of the current graph, split into errors and warnings. */
export function useViolationsBySeverity(graph: ApplicationGraph): ViolationsBySeverity {
  const violations = useViolations(graph);
  return useMemo(() => bySeverity(violations), [violations]);
}
