import * as Tooltip from "@radix-ui/react-tooltip";
import { RotateCcw } from "lucide-react";
import type { ApplicationNode } from "@dataspecer/app-generator/graph";
import { isGeneratedNodeId, nextNodeId } from "@/graph/mutations.ts";
import { useEditorStore } from "@/store.ts";

/**
 * Names the node after its aggregate and operation. Only a hand written ID offers this, an ID the
 * scheme produced already follows them and is regenerated when either changes.
 */
export function NodeIdReset({ node }: { node: ApplicationNode }) {
  const graph = useEditorStore((state) => state.graph);
  const aggregateName = useEditorStore(
    (state) => state.metadata?.aggregates.find((entry) => entry.iri === node.aggregateIri)?.name,
  );
  const renameNode = useEditorStore((state) => state.renameNode);

  if (
    graph === null ||
    aggregateName === undefined ||
    isGeneratedNodeId(node.id, aggregateName, node.operation)
  ) {
    return null;
  }
  const generated = nextNodeId(graph, aggregateName, node.operation, node.id);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100"
          onClick={() => renameNode(node.id, generated)}
          aria-label={`Reset the node ID to ${generated}`}
        >
          <RotateCcw size={13} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          align="end"
          className="max-w-64 rounded border border-slate-200 bg-white px-2 py-1 text-sm font-normal text-slate-600 shadow-md"
        >
          Reset the ID to &quot;{generated}&quot;. Edges referring to the node will update as well.
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
