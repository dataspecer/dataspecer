import {
  Operation,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from "@dataspecer/app-generator/graph";
import { isGeneratedNodeId, nextNodeId } from "../../graph/mutations.ts";
import { useEditorStore } from "../../store.ts";
import { aggregateLink } from "../../utils/specification-links.ts";
import { ExternalLink } from "../external-link.tsx";
import { AssociationEditor, CascadeEditor } from "./config-editors.tsx";
import { ElementViolations } from "./element-violations.tsx";
import { FormField, inputClass } from "./form-field.tsx";

const OPERATIONS = [
  Operation.ReadList,
  Operation.ReadDetail,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
];

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
  const graph = useEditorStore((state) => state.graph);
  const metadata = useEditorStore((state) => state.metadata);
  const updateNode = useEditorStore((state) => state.updateNode);
  const renameNode = useEditorStore((state) => state.renameNode);
  const removeNode = useEditorStore((state) => state.removeNode);

  const aggregate = metadata?.aggregates.find((entry) => entry.iri === node.aggregateIri);
  const link = graph ? aggregateLink(graph.dataSpecificationIri, node.aggregateIri) : null;

  const patchConfig = (patch: Partial<ApplicationNodeConfig>) => {
    updateNode(node.id, { config: normalizeConfig({ ...node.config, ...patch }) });
  };

  const nameOf = (aggregateIri: string) =>
    metadata?.aggregates.find((entry) => entry.iri === aggregateIri)?.name;

  // An ID the scheme produced is regenerated when the aggregate or operation changes. A hand
  // written ID is kept, because it may be a deliberate name and it ends up as a route in the
  // generated application.
  const aggregateName = nameOf(node.aggregateIri);
  const generatedId =
    aggregateName !== undefined && isGeneratedNodeId(node.id, aggregateName, node.operation);

  const applyWithId = (
    patch: Partial<Omit<ApplicationNode, "id">>,
    aggregateIri: string,
    operation: Operation,
  ) => {
    const { graph } = useEditorStore.getState();
    const name = nameOf(aggregateIri);
    if (graph && name && generatedId) {
      renameNode(node.id, nextNodeId(graph, name, operation, node.id), patch);
    } else {
      updateNode(node.id, patch);
    }
  };

  // Association paths belong to the aggregate, so a different aggregate invalidates them. The
  // stale sections would otherwise stay in the config while the form no longer shows them.
  const changeAggregate = (aggregateIri: string) => {
    applyWithId(
      { aggregateIri, config: normalizeConfig({ pageTitle: node.config?.pageTitle }) },
      aggregateIri,
      node.operation,
    );
  };

  // Association kinds are meaningful on Create and Update nodes, delete policies on Delete
  // nodes. Switching the operation drops the sections the new operation cannot have.
  const changeOperation = (operation: Operation) => {
    const keepAssociations = operation === Operation.Create || operation === Operation.Update;
    applyWithId(
      {
        operation,
        config: normalizeConfig({
          pageTitle: node.config?.pageTitle,
          associations: keepAssociations ? node.config?.associations : undefined,
          delete: operation === Operation.Delete ? node.config?.delete : undefined,
        }),
      },
      node.aggregateIri,
      operation,
    );
  };

  return (
    <div className="flex flex-col gap-3 p-3">

      <FormField
        label="Data structure"
        hint="Data structure this page works with."
        action={
          link && <ExternalLink href={link} label="Open the data structure in the specification editor" />
        }
      >
        {metadata ? (
          <select
            className={inputClass}
            value={node.aggregateIri}
            onChange={(event) => changeAggregate(event.target.value)}
          >
            {!aggregate && <option value={node.aggregateIri}>{node.aggregateIri || "..."}</option>}
            {metadata.aggregates.map((entry) => (
              <option key={entry.iri} value={entry.iri}>
                {entry.name}
              </option>
            ))}
          </select>
        ) : (
          // disabled, because without the data structures of the specification there is nothing
          // valid to pick
          <input className={inputClass} value={node.aggregateIri} disabled />
        )}
      </FormField>

      <FormField label="Operation" hint="What the page does with the data structure.">
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

      <FormField label="Page title" hint="Heading of the generated page.">
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
        className="self-start rounded border border-red-300 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
        onClick={() => removeNode(node.id)}
      >
        Delete node
      </button>

      <ElementViolations kind="node" id={node.id} />
    </div>
  );
}
