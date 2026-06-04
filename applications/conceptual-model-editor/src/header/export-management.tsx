import { ReactNode, useEffect, useRef, useState } from "react";
import { Bug } from "lucide-react";
import { generateLightweightOwl } from "@dataspecer/lightweight-owl";
import type { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { type Entities, type Entity, type EntityModel } from "@dataspecer/core-v2/entity-model";
import * as DataSpecificationVocabulary from "@dataspecer/data-specification-vocabulary/semantic-model";
import { shaclToRdf, semanticModelsToShacl } from "@dataspecer/shacl-v2";

import { useModelGraphContext } from "../context/model-context";
import { useClassesContext } from "../context/classes-context";
import { entityWithOverriddenIri, getIri, getModelIri } from "../util/iri-utils";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";

import { useActions } from "../action/actions-react-binding";

export const ExportManagement = () => {
  const actions = useActions();
  const { aggregatorView, models } = useModelGraphContext();
  const { sourceModelOfEntityMap } = useClassesContext();

  const { download } = useDownload();

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      menuRef.current?.focus();
    }
  }, [open]);

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
      .catch((err) => console.error("Failed to export OWL ontology.", err));
  };

  const handleExportSVG = async () => {
    const svg = await actions.diagram?.actions().renderToSvgString();
    if (svg === null || svg === undefined) {
      console.error("Failed to export SVG file.");
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
    })().catch((err) => console.error("Failed to export DSV.", err));
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
    }).catch((err) => console.error("Failed to export SHACL.", err));
  };

  return (
    <div className="flex relative">
      <button
        ref={buttonRef}
        title="Debug menu"
        onClick={() => setOpen(prev => !prev)}
        className="text-white hover:bg-white/20 px-2"
      >
        <Bug className="h-5 w-5" />
        <span className="sr-only">Debug menu</span>
      </button>
      {open === true ? (
        <div
          ref={menuRef}
          tabIndex={-1}
          className="absolute right-0 top-[70%] z-10 flex flex-col min-w-48 text-black bg-white rounded-md shadow-lg border border-gray-200 py-1 mt-1"
          onBlur={(event) => {
            if (menuRef.current?.contains(event.relatedTarget as Node)) {
              return;
            }
            if (event.relatedTarget === buttonRef.current) {
              return;
            }
            setOpen(false);
          }}
        >
          <DropdownItem title="Download current view as SVG file."
            onClick={() => { setOpen(false); handleExportSVG(); }}>
            💾 Export SVG
          </DropdownItem>
          <DropdownItem title="Generate RDFS/OWL (vocabulary)"
            onClick={() => { setOpen(false); handleGenerateLightweightOwl(); }}>
            💾 Export RDFS/OWL
          </DropdownItem>
          <DropdownItem
            title="Generate DSV (application profile)"
            onClick={() => { setOpen(false); handleGenerateDataSpecificationVocabulary(); }}>
            💾 Export DSV
          </DropdownItem>
          <DropdownItem
            title="Generate SHACL for profile"
            onClick={() => { setOpen(false); handleGenerateProfileShacl(); }}>
            💾 Export SHACL
          </DropdownItem>
        </div>
      ) : null}
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

const DropdownItem = (props: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
}) => {
  return (
    <button
      {...props}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-100 cursor-pointer"
    >
      {props.children}
    </button>
  );
};
