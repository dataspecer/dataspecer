import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Operation } from "@dataspecer/app-generator/graph";
import { skeletonGraph, SKELETON_OPERATIONS } from "../graph/generate-graph.ts";
import { useEditorStore } from "../store.ts";
import { autoLayout } from "./auto-layout.ts";
import { OPERATION_LABELS } from "./operation-style.ts";

const DEFAULT_OPERATIONS: ReadonlySet<Operation> = new Set(SKELETON_OPERATIONS);

function toggled(set: ReadonlySet<string>, value: string, present: boolean): Set<string> {
  const next = new Set(set);
  if (present) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return next;
}

/** Builds a graph skeleton over the specification, replacing the current graph. */
export function GenerateGraphDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const aggregates = useEditorStore((state) => state.metadata?.aggregates ?? []);
  const contentRef = useRef<HTMLDivElement>(null);
  const [operations, setOperations] = useState<ReadonlySet<Operation>>(DEFAULT_OPERATIONS);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [building, setBuilding] = useState(false);
  const selectedAggregates = aggregates.filter((aggregate) => !excluded.has(aggregate.iri));

  const generate = async () => {
    const { graph, requestConfirm, replaceGraph, requestFitView, setActionError } =
      useEditorStore.getState();
    if (graph === null || selectedAggregates.length === 0) {
      return;
    }
    if (graph.nodes.length > 0) {
      const confirmed = await requestConfirm({
        title: "Replace the graph?",
        message: `The generated graph replaces the current ${graph.nodes.length} node(s) and ${graph.edges.length} edge(s).`,
        confirmLabel: "Replace",
      });
      if (!confirmed) {
        return;
      }
    }
    setBuilding(true);
    try {
      const next = skeletonGraph(graph, selectedAggregates, operations);
      replaceGraph(next, await autoLayout(next));
      requestFitView();
      onClose();
    } catch (caught) {
      console.error(caught);
      setActionError(
        `Generating the graph failed: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    } finally {
      setBuilding(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20" />
        <Dialog.Content
          ref={contentRef}
          tabIndex={-1}
          className="fixed left-1/2 top-1/2 w-[44rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-4 shadow-lg outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
        >
          <Dialog.Title className="text-sm font-semibold text-slate-800">
            Generate graph
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            Creates a node for every selected data structure and operation, then connects them using transitions
            and redirects.
          </Dialog.Description>

          <fieldset className="mt-4">
            <legend className="flex w-full items-center gap-2 text-sm font-medium text-slate-500">
              Data structures
              <span className="grow" />
              <button
                type="button"
                className="cursor-pointer text-xs text-blue-600 hover:underline"
                onClick={() => setExcluded(new Set())}
              >
                All
              </button>
              <button
                type="button"
                className="cursor-pointer text-xs text-blue-600 hover:underline"
                onClick={() => setExcluded(new Set(aggregates.map((aggregate) => aggregate.iri)))}
              >
                None
              </button>
            </legend>
            <div className="mt-1 flex max-h-80 flex-col gap-1 overflow-y-auto rounded border border-slate-200 p-2">
              {aggregates.map((aggregate) => (
                <label
                  key={aggregate.iri}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={!excluded.has(aggregate.iri)}
                    onChange={(event) =>
                      setExcluded(toggled(excluded, aggregate.iri, !event.target.checked))
                    }
                  />
                  <span className="min-w-0 truncate" title={aggregate.name}>
                    {aggregate.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-500">Operations</legend>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {SKELETON_OPERATIONS.map((operation) => (
                <label key={operation} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={operations.has(operation)}
                    onChange={(event) => {
                      const next = new Set(operations);
                      if (event.target.checked) {
                        next.add(operation);
                      } else {
                        next.delete(operation);
                      }
                      setOperations(next);
                    }}
                  />
                  {OPERATION_LABELS[operation]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              onClick={() => void generate()}
              disabled={building || operations.size === 0 || selectedAggregates.length === 0}
            >
              {building ? "Generating..." : "Generate"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
