import { generateLightweightOwl } from "@dataspecer/lightweight-owl";
import type { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { type Entities, type Entity, type EntityModel } from "@dataspecer/core-v2/entity-model";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary/semantic-model";
import { shaclToRdf, semanticModelsToShacl } from "@dataspecer/shacl-v2";

import { useModelGraphContext } from "../context/model-context";
import { useClassesContext } from "../context/classes-context";
import { entityWithOverriddenIri, getIri, getModelIri } from "../util/iri-utils";
import { ExportButton } from "./components/export-button";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";

import { useActions } from "../action/actions-react-binding";

export const ExportManagement = () => {
  const actions = useActions();
  const { aggregatorView, models } = useModelGraphContext();
  const { sourceModelOfEntityMap } = useClassesContext();

  const { download } = useDownload();


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
    generateLightweightOwl(entities, context)
      .then((generatedLightweightOwl) => {
        const date = Date.now();
        download(generatedLightweightOwl, `dscme-lw-ontology-${date}.ttl`, "text/plain");
      })
      .catch((err) => console.log("couldn't generate lw-ontology", err));
  };

  const handleExportSVG = async () => {
    const svg = await actions.diagram?.actions().renderToSvgString();
    if (svg === null || svg === undefined) {
      console.error("Can not export SVG file.")
      return;
    }
    const date = Date.now();
    download(svg, `dscme-workspace-${date}.svg`, "image/svg+xml");
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

    const shacl = semanticModelsToShacl(
      semanticModels.map(model => new SemanticModelWrap(model)),
      profileModels.map(model => new SemanticModelWrap(model)),
      new SemanticModelWrap(topProfileModel),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      }, { baseIri: iri, defaultPrefixes: {} },);

    shaclToRdf(shacl, {
      prettyPrint: true,
    }).then(shaclAsRdf => {
      console.log("SHACL export:", shaclAsRdf);
      const date = Date.now();
      download(shaclAsRdf, `shacl-profile-${date}.ttl`, "text/plain");
    });
  };

  return (
    <div className="my-auto mr-2 flex flex-row">
      <ExportButton title="Download current view as SVG file." onClick={handleExportSVG}>
        💾svg
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

const useDownload = () => {
  const download = (content: string, name: string, type: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: type });
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadImage = (dataUrl: string) => {
    const a = document.createElement("a");

    a.setAttribute("download", "reactflow.svg");
    a.setAttribute("href", dataUrl);
    a.click();
  };

  return { download, downloadImage };
};

