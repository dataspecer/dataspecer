import { completeNodePositions } from '@/diagram/auto-layout.ts';
import { useEditorStore } from '@/store.ts';
import { parseGraph } from './parse-graph.ts';

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
  if (!parsed.ok) {
    return { applied: false, error: parsed.error };
  }

  const { graph: current, requestConfirm } = useEditorStore.getState();
  // Aggregate IRIs belong to one specification, so pointing the graph at another one invalidates
  // every node. The field cannot be edited in the form, so this is the only way to change it.
  if (current !== null && current.dataSpecificationIri !== parsed.graph.dataSpecificationIri) {
    const confirmed = await requestConfirm({
      title: 'Different data specification',
      message:
        `The graph targets "${parsed.graph.dataSpecificationIri}" instead of ` +
        `"${current.dataSpecificationIri}". Data structures of the current specification will not ` +
        `resolve.`,
      confirmLabel: 'Apply anyway',
    });
    if (!confirmed) {
      return { applied: false, error: null };
    }
  }

  // read again after the answer, because the canvas may have moved on while the dialog was open
  const { positions, replaceGraph } = useEditorStore.getState();
  const completedPositions = await completeNodePositions(parsed.graph, positions);
  replaceGraph(parsed.graph, completedPositions);
  return { applied: true, error: null };
}
