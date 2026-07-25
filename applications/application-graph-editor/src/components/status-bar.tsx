import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ApplicationGraph } from "@dataspecer/app-generator/graph";
import { runSemanticValidation } from "../backend/run-validation.ts";
import { useEditorStore, type SaveState } from "../store.ts";
import { combinedViolations } from "../validation/violations.ts";

export function StatusBar({ graph }: { graph: ApplicationGraph }) {
  const semanticValidation = useEditorStore((state) => state.semanticValidation);
  const saveState = useEditorStore((state) => state.saveState);
  const setSidebarTab = useEditorStore((state) => state.setSidebarTab);
  const [revalidating, setRevalidating] = useState(false);

  const problems = useMemo(
    () => combinedViolations(graph, semanticValidation),
    [graph, semanticValidation],
  );
  const semanticStale = semanticValidation !== null && semanticValidation.forGraph !== graph;

  const revalidate = () => {
    setRevalidating(true);
    runSemanticValidation(graph)
      .catch((caught: unknown) => {
        console.error(caught);
      })
      .finally(() => setRevalidating(false));
  };

  return (
    <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-3 py-1">
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center gap-1 text-xs ${
          problems.length === 0 ? "text-slate-600" : "text-red-700"
        }`}
        onClick={() => setSidebarTab("problems")}
      >
        {problems.length === 0 ? (
          <>
            <CheckCircle2 size={13} className="text-green-700" /> No problems
          </>
        ) : (
          <>
            <XCircle size={13} />
            {problems.length} problem{problems.length === 1 ? "" : "s"}
          </>
        )}
      </button>
      {semanticStale && (
        <button
          type="button"
          className="cursor-pointer text-xs text-amber-700"
          onClick={revalidate}
          disabled={revalidating}
        >
          {revalidating ? "revalidating…" : "semantic results outdated, click to revalidate"}
        </button>
      )}
      <div className="grow" />
      <SaveIndicator state={saveState} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return <span className="text-xs text-slate-400">Saving…</span>;
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle size={13} /> Save failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <CheckCircle2 size={13} /> Auto-saved
    </span>
  );
}
