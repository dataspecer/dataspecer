import { useMemo } from "react";
import { generate } from "@dataspecer/core-v2/semantic-model/lightweight-owl";
import type { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { type Entities, type Entity, type EntityModel } from "@dataspecer/core-v2/entity-model";
import type { VisualModel, WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import {
  type ExportedConfigurationType,
  modelsToWorkspaceString,
  useLocalStorage,
} from "../features/export/export-utils";
import { useModelGraphContext } from "../context/model-context";
import { useDownload } from "../features/export/download";
import { useClassesContext } from "../context/classes-context";
import { entityWithOverriddenIri, getIri, getModelIri } from "../util/iri-utils";
import { ExportButton } from "../components/management/buttons/export-button";
import { useQueryParamsContext } from "../context/query-params-context";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary";
import { isInMemorySemanticModel } from "../utilities/model";
import { createShaclForProfile, shaclToRdf, createSemicShaclStylePolicy } from "@dataspecer/shacl-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

export const ExportManagement = () => {
  const { aggregator, aggregatorView, models, visualModels, setAggregatorView, replaceModels } =
    useModelGraphContext();
  const { sourceModelOfEntityMap } = useClassesContext();
  const { saveWorkspaceState } = useLocalStorage();

  const { updatePackageId: setPackage } = useQueryParamsContext();
  const { download } = useDownload();
  const service = useMemo(() => new BackendPackageService("fail-if-needed", httpFetch), []);

  const uploadConfiguration = (contentType: string = "application/json") => {
    return new Promise<string | undefined>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = false;
      input.accept = contentType;

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(undefined);
          return;
        }

        const fileReader = new FileReader();
        fileReader.readAsText(file);

        fileReader.onload = (readerEvent) => {
          const content = readerEvent?.target?.result;
          if (typeof content === "string") {
            resolve(content);
            return;
          }
          resolve(undefined);
        };
      };

      input.click();
    });
  };

  const loadWorkSpaceConfiguration = (
    entityModels: EntityModel[],
    visualModels: VisualModel[],
    activeView?: string
  ) => {
    replaceModels(entityModels, visualModels as WritableVisualModel[]);
    aggregatorView.changeActiveVisualModel(activeView ?? visualModels.at(0)?.getId() ?? null);
    setAggregatorView(aggregator.getView());
  };

  const handleGenerateLightweightOwl = () => {
    const entities = Object.values(aggregatorView.getEntities())
      .map((aggregatedEntityWrapper) => aggregatedEntityWrapper.aggregatedEntity)
      .filter((entityOrNull): entityOrNull is SemanticModelEntity => {
        return entityOrNull !== null;
      })
      .map((aggregatedEntity) => {
        const modelBaseIri = getModelIri(models.get(sourceModelOfEntityMap.get(aggregatedEntity.id) ?? ""));
        const entityIri = getIri(aggregatedEntity, modelBaseIri);

        if (!entityIri) {
          return aggregatedEntity;
        }

        return entityWithOverriddenIri(entityIri, aggregatedEntity);
      });
    const context = {
      // TODO Get base URL.
      baseIri: "",
      iri: "",
    };
    generate(entities, context)
      .then((generatedLightweightOwl) => {
        const date = Date.now();
        download(generatedLightweightOwl, `dscme-lw-ontology-${date}.ttl`, "text/plain");
      })
      .catch((err) => console.log("couldn't generate lw-ontology", err));
  };

  const handleLoadWorkspaceFromJson = () => {
    const loadConfiguration = async (configuration: string) => {
      const { modelDescriptors, activeView } = JSON.parse(configuration) as ExportedConfigurationType;
      const [entityModels, visualModels] = await service.getModelsFromModelDescriptors(modelDescriptors);

      loadWorkSpaceConfiguration(entityModels, visualModels, activeView);
    };

    uploadConfiguration()
      .then((configuration) => {
        if (!configuration) {
          return;
        }

        console.log("configuration is gonna be used");
        loadConfiguration(configuration).catch((err) => console.log("problem with loading configuration", err));
        // Make sure we won't work with packages any more
        setPackage(null);
      })
      .catch(console.error);
  };

  const handleExportWorkspaceToJson = () => {
    const activeView = aggregatorView.getActiveVisualModel()?.getId();
    const date = Date.now();
    const workspace = modelsToWorkspaceString(models, visualModels, date, activeView);
    download(workspace, `dscme-workspace-${date}.json`, "application/json");
    saveWorkspaceState(models, visualModels, activeView);
  };

  const handleGenerateDataSpecificationVocabulary = () => {
    // We collect all models as context and all entities for export.
    const conceptualModelIri = "";
    const contextModels = [];
    const modelForExport: DataSpecificationVocabulary.EntityListContainer = {
      baseIri: "",
      entities: [],
    };
    for (const model of models.values()) {
      contextModels.push({
        baseIri: isInMemorySemanticModel(model) ? model.getBaseIri() : "",
        entities: Object.values(model.getEntities()),
      });
      Object.values(model.getEntities()).forEach(entity => modelForExport.entities.push(entity));
    }
    // Create context.
    const context = DataSpecificationVocabulary.createContext(contextModels);
    // The parent function can not be async, so we wrap the export in a function.
    (async () => {
      const conceptualModel = DataSpecificationVocabulary.entityListContainerToConceptualModel(
        conceptualModelIri, modelForExport, context);
      const stringContent = await DataSpecificationVocabulary.conceptualModelToRdf(
        conceptualModel, { prettyPrint: true });
      const date = Date.now();
      download(stringContent, `dscme-dsv-${date}.ttl`, "text/plain");
    })()
      .catch(console.error);
  };

  const handleGenerateProfileShacl = () => {
    const semanticModels = [...models.values()];
    const profileModels = [...models.values()];
    const topProfileModel = profileModels[0];

    const iri = isInMemorySemanticModel(topProfileModel) ?
     topProfileModel.getBaseIri() : topProfileModel.getId();

    console.log({ semanticModels, profileModels, topProfileModel });

    const shacl = createShaclForProfile(
      semanticModels.map(model => new SemanticModelWrap(model)),
      profileModels, topProfileModel,
      createSemicShaclStylePolicy(iri));

    shaclToRdf(shacl, {
      prettyPrint: true,
    }).then(shaclAsRdf => {
      console.log(shaclAsRdf);
      const date = Date.now();
      download(shaclAsRdf, `shacl-profile-${date}.ttl`, "text/plain");
    });
  };

  return (
    <div className="my-auto mr-2 flex flex-row">
      <ExportButton title="Open workspace from configuration file" onClick={handleLoadWorkspaceFromJson}>
        📥ws
      </ExportButton>
      <ExportButton title="Generate workspace configuration file" onClick={handleExportWorkspaceToJson}>
        💾ws
      </ExportButton>
      <ExportButton title="Generate RDFS/OWL (vocabulary)" onClick={handleGenerateLightweightOwl}>
        💾rdfs/owl
      </ExportButton>
      <ExportButton title="Generate DSV (application profile)" onClick={handleGenerateDataSpecificationVocabulary}>
        💾dsv
      </ExportButton>
      <ExportButton title="Generate SHACL for profile" onClick={handleGenerateProfileShacl}>
        💾shacl
      </ExportButton>
    </div>
  );
};

class SemanticModelWrap implements EntityModel {

  readonly baseIri: string;

  readonly model: EntityModel;

  constructor(model: EntityModel) {
    if (model instanceof InMemorySemanticModel) {
      this.baseIri = model.getBaseIri();
    } else {
      this.baseIri = "";
    }
    this.model = model;
  }

  getEntities(): Entities {
    return this.model.getEntities();
  }

  subscribeToChanges(
    callback: (updated: Record<string, Entity>, removed: string[]) => void,
  ): () => void {
    return this.model.subscribeToChanges(callback);
  }

  getId(): string {
    return this.model.getId();
  }

  getAlias(): string | null {
    return this.model.getAlias();
  }

  setAlias(alias: string | null): void {
    return this.model.setAlias(alias);
  }

  getBaseIri(): string {
    return this.baseIri;
  }

}
