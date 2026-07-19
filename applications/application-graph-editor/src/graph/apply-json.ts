import { autoLayout } from "../diagram/auto-layout.ts";
import { useEditorStore } from "../store.ts";
import { parseGraph } from "./parse-graph.ts";

/**
 * Parses graph text and makes it the edited graph. Nodes keep their current canvas positions
 * where the id survives, everything else gets a computed one, so importing a fully different
 * graph lays it out fresh while a small JSON edit leaves the canvas alone. Returns an error
 * message instead of applying when the text is not a valid graph.
 */
export async function applyGraphJson(jsonText: string): Promise<string | null> {
  const parsed = parseGraph(jsonText);
  if ("error" in parsed) {
    return parsed.error;
  }

  const { positions, replaceGraph } = useEditorStore.getState();
  const needsLayout = parsed.graph.nodes.some((node) => !positions[node.id]);
  const layout = needsLayout ? await autoLayout(parsed.graph) : {};
  const merged = Object.fromEntries(
    parsed.graph.nodes.map((node) => [node.id, positions[node.id] ?? layout[node.id]]),
  );
  replaceGraph(parsed.graph, merged);
  return null;
}
