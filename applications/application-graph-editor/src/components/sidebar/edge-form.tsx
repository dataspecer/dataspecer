import { ArrowRight } from "lucide-react";
import { EdgeType, type ApplicationEdge } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../../store.ts";
import { ElementViolations } from "./element-violations.tsx";
import { FormField, inputClass } from "./form-field.tsx";

function NodeLink({ id }: { id: string }) {
  const select = () => {
    const store = useEditorStore.getState();
    store.setSelection({ kind: "node", id });
    store.requestFocus(id);
  };

  return (
    <button
      type="button"
      className="min-w-0 cursor-pointer truncate rounded px-1 text-slate-700 hover:bg-slate-100 hover:underline"
      onClick={select}
      title={id}
    >
      {id}
    </button>
  );
}

export function EdgeForm({ edge }: { edge: ApplicationEdge }) {
  const updateEdge = useEditorStore((state) => state.updateEdge);
  const removeEdge = useEditorStore((state) => state.removeEdge);

  return (
    <div className="flex flex-col gap-3 p-3">
      <FormField label="Connected nodes" hint="Click to open a node." asLabel={false}>
        <div className="flex items-center gap-1 text-sm">
          <NodeLink id={edge.source} />
          <ArrowRight size={12} className="shrink-0 text-slate-400" />
          <NodeLink id={edge.target} />
        </div>
      </FormField>

      <FormField
        label="Type"
        hint="A transition adds a control the user clicks. A redirect opens the target on its own once the source operation succeeds."
      >
        <select
          className={inputClass}
          value={edge.type}
          onChange={(event) => updateEdge(edge.id, { type: event.target.value as EdgeType })}
        >
          <option value={EdgeType.Transition}>transition</option>
          <option value={EdgeType.Redirect}>redirect</option>
        </select>
      </FormField>

      <button
        type="button"
        className="self-start rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
        onClick={() => removeEdge(edge.id)}
      >
        Delete edge
      </button>

      <ElementViolations kind="edge" id={edge.id} />
    </div>
  );
}
