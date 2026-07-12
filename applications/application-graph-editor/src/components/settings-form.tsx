import { DatasourceType, type ApplicationGraph } from "@dataspecer/app-generator/graph";
import { useEditorStore } from "../store.ts";
import { FormField, inputClass } from "./form-field.tsx";

export function SettingsForm({ graph }: { graph: ApplicationGraph }) {
  const updateGraphMeta = useEditorStore((state) => state.updateGraphMeta);
  const datasource = graph.datasources[0] ?? { id: "", type: DatasourceType.Rdf, endpoint: "" };

  return (
    <div className="flex flex-col gap-3 p-3">
      <FormField label="Application name">
        <input
          className={inputClass}
          value={graph.name}
          onChange={(event) => updateGraphMeta({ name: event.target.value })}
        />
      </FormField>

      <FormField label="Data specification IRI">
        <input
          className={inputClass}
          value={graph.dataSpecificationIri}
          onChange={(event) => updateGraphMeta({ dataSpecificationIri: event.target.value })}
        />
      </FormField>

      <FormField label="Datasource id">
        <input
          className={inputClass}
          value={datasource?.id ?? ""}
          onChange={(event) =>
            updateGraphMeta({ datasources: [{ ...datasource, id: event.target.value }] })
          }
        />
      </FormField>

      <FormField label="Datasource endpoint">
        <input
          className={inputClass}
          value={datasource?.endpoint ?? ""}
          onChange={(event) =>
            updateGraphMeta({ datasources: [{ ...datasource, endpoint: event.target.value }] })
          }
        />
      </FormField>
    </div>
  );
}
