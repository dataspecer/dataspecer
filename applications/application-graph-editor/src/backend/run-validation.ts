import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { validateGraph } from "./client.ts";

/** Runs backend semantic validation and stores the result for the given graph snapshot. */
export async function runSemanticValidation(graph: ApplicationGraph): Promise<void> {
  const result = await validateGraph(graph);
  useEditorStore.getState().setSemanticValidation({
    violations: result.violations,
    forGraph: graph,
  });
}
