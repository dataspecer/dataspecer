import {
  AssociationKind,
  DeletePolicy,
  FieldKind,
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from "@dataspecer/app-generator/graph";
import { omit } from "es-toolkit";
import { Hint } from "@/components/hint.tsx";

interface ConfigEditorProps {
  node: ApplicationNode;
  aggregate: AggregateMetadata;
  onPatch: (patch: Partial<ApplicationNodeConfig>) => void;
}

/** Flattens the aggregate's association fields into dotted paths. */
function associationPaths(fields: AggregateFieldMetadata[], prefix = ""): string[] {
  return fields.flatMap((field) => {
    if (field.kind !== FieldKind.Association) {
      return [];
    }
    const path = prefix === "" ? field.path : `${prefix}.${field.path}`;
    return [path, ...associationPaths(field.fields ?? [], path)];
  });
}

export function AssociationEditor({ node, aggregate, onPatch }: ConfigEditorProps) {
  const paths = associationPaths(aggregate.fields);
  if (paths.length === 0) {
    return null;
  }
  const current = node.config?.associations ?? {};

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-500">
          Association kinds
          <Hint text="A composition is part of this entity: it is created, edited and deleted with it. An aggregation exists on its own and is only referenced." />
        </legend>
      <div className="flex flex-col gap-1">
        {paths.map((path) => (
          <div key={path} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700" title={path}>
              {path}
            </span>
            <select
              className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm"
              value={current[path] ?? ""}
              onChange={(event) => {
                onPatch({
                  associations:
                    event.target.value === ""
                      ? omit(current, [path])
                      : { ...current, [path]: event.target.value as AssociationKind },
                });
              }}
            >
              <option value="">—</option>
              <option value={AssociationKind.Aggregation}>aggregation</option>
              <option value={AssociationKind.Composition}>composition</option>
            </select>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function CascadeEditor({ node, aggregate, onPatch }: ConfigEditorProps) {
  const paths = associationPaths(aggregate.fields);
  if (paths.length === 0) {
    return null;
  }
  const current = node.config?.delete ?? {};

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-500">
        Cascade delete
        <Hint text="Deleting this entity also deletes the entities on the checked paths. Only compositions can cascade, an aggregation may have other owners." />
      </legend>
      <div className="flex flex-col gap-1">
        {paths.map((path) => (
          <label key={path} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={current[path] === DeletePolicy.Cascade}
              onChange={(event) => {
                onPatch({
                  delete: event.target.checked
                    ? { ...current, [path]: DeletePolicy.Cascade }
                    : omit(current, [path]),
                });
              }}
            />
            <span className="min-w-0 flex-1 truncate" title={path}>
              {path}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
