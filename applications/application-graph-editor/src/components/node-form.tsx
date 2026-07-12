import {
  AssociationKind,
  DeletePolicy,
  FieldKind,
  Operation,
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { FormField, inputClass } from "./form-field.tsx";

const OPERATIONS = [
  Operation.ReadList,
  Operation.ReadDetail,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
];

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

/** Removes empty config sections so an untouched node keeps no config at all. */
function normalizeConfig(config: ApplicationNodeConfig): ApplicationNodeConfig | undefined {
  const result: ApplicationNodeConfig = {};
  if (config.pageTitle) {
    result.pageTitle = config.pageTitle;
  }
  if (config.associations && Object.keys(config.associations).length > 0) {
    result.associations = config.associations;
  }
  if (config.delete && Object.keys(config.delete).length > 0) {
    result.delete = config.delete;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function NodeForm({ node }: { node: ApplicationNode }) {
  const metadata = useEditorStore((state) => state.metadata);
  const updateNode = useEditorStore((state) => state.updateNode);
  const removeNode = useEditorStore((state) => state.removeNode);

  const aggregate = metadata?.aggregates.find((entry) => entry.iri === node.aggregateIri);

  const patchConfig = (patch: Partial<ApplicationNodeConfig>) => {
    updateNode(node.id, { config: normalizeConfig({ ...node.config, ...patch }) });
  };

  // Association paths belong to the aggregate, so a different aggregate invalidates them. The
  // stale sections would otherwise stay in the config while the form no longer shows them.
  const changeAggregate = (aggregateIri: string) => {
    updateNode(node.id, {
      aggregateIri,
      config: normalizeConfig({ pageTitle: node.config?.pageTitle }),
    });
  };

  // Association kinds are meaningful on Create and Update nodes, delete policies on Delete
  // nodes. Switching the operation drops the sections the new operation cannot have.
  const changeOperation = (operation: Operation) => {
    const keepAssociations = operation === Operation.Create || operation === Operation.Update;
    updateNode(node.id, {
      operation,
      config: normalizeConfig({
        pageTitle: node.config?.pageTitle,
        associations: keepAssociations ? node.config?.associations : undefined,
        delete: operation === Operation.Delete ? node.config?.delete : undefined,
      }),
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-slate-400">{node.id}</div>

      <FormField label="Aggregate">
        {metadata ? (
          <select
            className={inputClass}
            value={node.aggregateIri}
            onChange={(event) => changeAggregate(event.target.value)}
          >
            {!aggregate && <option value={node.aggregateIri}>{node.aggregateIri || "…"}</option>}
            {metadata.aggregates.map((entry) => (
              <option key={entry.iri} value={entry.iri}>
                {entry.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass}
            value={node.aggregateIri}
            onChange={(event) => changeAggregate(event.target.value)}
          />
        )}
      </FormField>

      <FormField label="Operation">
        <select
          className={inputClass}
          value={node.operation}
          onChange={(event) => changeOperation(event.target.value as Operation)}
        >
          {OPERATIONS.map((operation) => (
            <option key={operation} value={operation}>
              {operation}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Page title">
        <input
          className={inputClass}
          value={node.config?.pageTitle ?? ""}
          onChange={(event) => patchConfig({ pageTitle: event.target.value })}
        />
      </FormField>

      {(node.operation === Operation.Create || node.operation === Operation.Update) &&
        aggregate && <AssociationEditor node={node} aggregate={aggregate} onPatch={patchConfig} />}

      {node.operation === Operation.Delete && aggregate && (
        <CascadeEditor node={node} aggregate={aggregate} onPatch={patchConfig} />
      )}

      <button
        type="button"
        className="self-start rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
        onClick={() => removeNode(node.id)}
      >
        Delete node
      </button>
    </div>
  );
}

interface ConfigEditorProps {
  node: ApplicationNode;
  aggregate: AggregateMetadata;
  onPatch: (patch: Partial<ApplicationNodeConfig>) => void;
}

function AssociationEditor({ node, aggregate, onPatch }: ConfigEditorProps) {
  const paths = associationPaths(aggregate.fields);
  if (paths.length === 0) {
    return null;
  }
  const current = node.config?.associations ?? {};

  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-slate-500">Association kinds</legend>
      <div className="flex flex-col gap-1">
        {paths.map((path) => (
          <div key={path} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-slate-700" title={path}>
              {path}
            </span>
            <select
              className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
              value={current[path] ?? ""}
              onChange={(event) => {
                const associations = { ...current };
                if (event.target.value === "") {
                  delete associations[path];
                } else {
                  associations[path] = event.target.value as AssociationKind;
                }
                onPatch({ associations });
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

function CascadeEditor({ node, aggregate, onPatch }: ConfigEditorProps) {
  const paths = associationPaths(aggregate.fields);
  if (paths.length === 0) {
    return null;
  }
  const current = node.config?.delete ?? {};

  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-slate-500">Cascade delete</legend>
      <div className="flex flex-col gap-1">
        {paths.map((path) => (
          <label key={path} className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={current[path] === DeletePolicy.Cascade}
              onChange={(event) => {
                const cascade = { ...current };
                if (event.target.checked) {
                  cascade[path] = DeletePolicy.Cascade;
                } else {
                  delete cascade[path];
                }
                onPatch({ delete: cascade });
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
