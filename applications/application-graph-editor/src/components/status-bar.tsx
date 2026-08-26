import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useViolationsBySeverity } from "@/hooks/use-validation.ts";
import { useEditorStore, type SaveState } from "@/store.ts";

export function StatusBar() {
  const saveState = useEditorStore((state) => state.saveState);
  const setSidebarTab = useEditorStore((state) => state.setSidebarTab);
  const { errors, warnings } = useViolationsBySeverity();

  return (
    <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-3 py-1">
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-2 text-sm"
        onClick={() => setSidebarTab("problems")}
      >
        {errors.length === 0 && warnings.length === 0 && (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <CheckCircle2 size={13} className="text-green-700" /> No problems
          </span>
        )}
        {errors.length > 0 && (
          <span className="inline-flex items-center gap-1 text-red-700">
            <XCircle size={13} />
            {errors.length} error{errors.length === 1 ? "" : "s"}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle size={13} />
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </span>
        )}
      </button>
      <div className="grow" />
      <SaveIndicator state={saveState} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return <span className="text-sm text-slate-400">Saving...</span>;
  }
  if (state === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-700">
        <AlertTriangle size={13} /> Not saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-red-600">
        <XCircle size={13} /> Save failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-green-700">
      <CheckCircle2 size={13} /> Auto-saved
    </span>
  );
}
