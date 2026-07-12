import {
  EdgeType,
  isValidRedirectOperation,
  isValidTransitionOperation,
  type ApplicationEdge,
} from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { FormField, inputClass } from "./form-field.tsx";

export function EdgeForm({ edge }: { edge: ApplicationEdge }) {
  const graph = useEditorStore((state) => state.graph);
  const updateEdge = useEditorStore((state) => state.updateEdge);
  const removeEdge = useEditorStore((state) => state.removeEdge);

  const source = graph?.nodes.find((node) => node.id === edge.source);
  const target = graph?.nodes.find((node) => node.id === edge.target);

  const operationPairValid =
    source && target
      ? edge.type === EdgeType.Redirect
        ? isValidRedirectOperation(source.operation, target.operation)
        : isValidTransitionOperation(source.operation, target.operation)
      : true;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-slate-400">{edge.id}</div>
      <div className="text-xs text-slate-700">
        {edge.source} → {edge.target}
      </div>

      <FormField label="Type">
        <select
          className={inputClass}
          value={edge.type}
          onChange={(event) => updateEdge(edge.id, { type: event.target.value as EdgeType })}
        >
          <option value={EdgeType.Transition}>transition</option>
          <option value={EdgeType.Redirect}>redirect</option>
        </select>
      </FormField>

      {!operationPairValid && source && target && (
        <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          A {edge.type} from {source.operation} to {target.operation} is not valid.
        </p>
      )}

      <button
        type="button"
        className="self-start rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
        onClick={() => removeEdge(edge.id)}
      >
        Delete edge
      </button>
    </div>
  );
}
