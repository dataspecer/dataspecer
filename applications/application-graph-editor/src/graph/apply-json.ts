import { autoLayout } from "../diagram/auto-layout.ts";
import { useEditorStore } from "../store.ts";
import { parseGraph } from "./parse-graph.ts";

export interface ApplyGraphResult {
  /** False when the text was rejected or the user canceled the change. */
  applied: boolean;
  error: string | null;
}

/**
 * Parses graph text and makes it the edited graph. Nodes keep their current canvas positions
 * where the ID survives, everything else gets a computed one, so importing a fully different
 * graph lays it out fresh while a small JSON edit leaves the canvas alone.
 */
export async function applyGraphJson(jsonText: string): Promise<ApplyGraphResult> {
  const parsed = parseGraph(jsonText);
  if ("error" in parsed) {
    return { applied: false, error: parsed.error };
  }

  const { graph: current, positions, replaceGraph, requestConfirm } = useEditorStore.getState();
  // Aggregate IRIs belong to one specification, so pointing the graph at another one invalidates
  // every node. The field is not editable in the form, this is the only way to change it.
  if (current !== null && current.dataSpecificationIri !== parsed.graph.dataSpecificationIri) {
    const confirmed = await requestConfirm({
      title: "Different data specification",
      message:
        `The graph targets "${parsed.graph.dataSpecificationIri}" instead of ` +
        `"${current.dataSpecificationIri}". Aggregates of the current specification will not ` +
        `resolve.`,
      confirmLabel: "Apply anyway",
    });
    if (!confirmed) {
      return { applied: false, error: null };
    }
  }

  const needsLayout = parsed.graph.nodes.some((node) => !positions[node.id]);
  const layout = needsLayout ? await autoLayout(parsed.graph) : {};
  const merged = Object.fromEntries(
    parsed.graph.nodes.map((node) => [node.id, positions[node.id] ?? layout[node.id]]),
  );
  replaceGraph(parsed.graph, merged);
  return { applied: true, error: null };
}
