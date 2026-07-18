import { useMemo } from "react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";

/** Synchronized JSON view of the edited graph. Validity lives in the problems panel. */
export function JsonPanel({ graph }: { graph: ApplicationGraph }) {
  const setJsonPanelOpen = useEditorStore((state) => state.setJsonPanelOpen);

  const json = useMemo(() => JSON.stringify(graph, null, 2), [graph]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-semibold text-slate-700">JSON</span>
        <button
          type="button"
          className="rounded px-2 text-slate-500 hover:bg-slate-100"
          onClick={() => setJsonPanelOpen(false)}
          aria-label="Close JSON panel"
        >
          ×
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto px-3 py-2 text-xs leading-relaxed text-slate-800">
        {json}
      </pre>
    </aside>
  );
}
