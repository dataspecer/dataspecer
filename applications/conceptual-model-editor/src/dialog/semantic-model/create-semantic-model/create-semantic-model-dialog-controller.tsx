import { useMemo } from "react";
import { type DialogProps } from "../../dialog-api";

const PREDEFINED_MODELS: PredefinedModel[] = [{
  "identifier": "legacy_adms",
  "label": "ADMS - Asset Description Metadata Schema",
  "url": "https://www.w3.org/ns/legacy_adms",
}, {
  "identifier": "legacy_locn",
  "label": "Core Location Vocabulary - Legacy version",
  "url": "https://www.w3.org/ns/legacy_locn.ttl",
}, {
  "identifier": "locn",
  "label": "Core Location Vocabulary 2.1.0",
  "url": "https://semiceu.github.io/Core-Location-Vocabulary/releases/2.1.0/voc/core-location.ttl",
}, {
  "identifier": "dcat",
  "label": "DCAT - Data Catalog Vocabulary",
  "url": "https://www.w3.org/ns/dcat3.ttl",
}, {
  "identifier": "dcatap",
  "label": "DCAT-AP vocabulary, the r5r namespace",
  "url": "https://semiceu.github.io/DCAT-AP/r5r/releases/3.0.0/voc/r5r.jsonld",
}, {
  "identifier": "dcterms",
  "label": "DCMI Metadata Terms",
  "url": "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
}, {
  "identifier": "eli",
  "label": "European Legislation Identifier (ELI)",
  "url": "https://op.europa.eu/documents/3938058/11669184/eli.owl/",
}, {
  "identifier": "foaf",
  "label": "FOAF (Friend of a Friend) Vocabulary",
  "url": "https://datagov-cz.github.io/cache-slovniku/foaf.ttl",
}, {
  "identifier": "geo",
  "label": "GeoSPARQL 1.1 Ontology",
  "url": "https://opengeospatial.github.io/ogc-geosparql/geosparql11/geo.ttl",
}, {
  "identifier": "sf",
  "label": "GeoSPARQL 1.1 Simple Features Definition",
  "url": "https://opengeospatial.github.io/ogc-geosparql/geosparql11/sf_geometries.ttl",
}, {
  "identifier": "odrl",
  "label": "ODRL Version 2.2",
  "url": "https://www.w3.org/ns/odrl/2/ODRL22.ttl",
}, {
  "identifier": "owl",
  "label": "OWL 2 - Web Ontology Language",
  "url": "https://www.w3.org/2002/07/owl#",
}, {
  "identifier": "prof",
  "label": "Profiles Vocabulary",
  "url": "https://www.w3.org/TR/dx-prof/rdf/prof.ttl",
}, {
  "identifier": "rdf",
  "label": "RDF - Resource Description Framework",
  "url": "https://datagov-cz.github.io/cache-slovniku/rdf.ttl",
}, {
  "identifier": "rdfs",
  "label": "RDFS - RDF Schema",
  "url": "https://datagov-cz.github.io/cache-slovniku/rdfs.ttl",
}, {
  "identifier": "skos",
  "label": "SKOS Simple Knowledge Organization System",
  "url": "https://datagov-cz.github.io/cache-slovniku/skos.rdf",
}, {
  "identifier": "spdx",
  "label": "SPDX 2.3.1",
  "url": "https://datagov-cz.github.io/cache-slovniku/spdx-ontology.2.3.1.ttl",
}, {
  "identifier": "time",
  "label": "Time Ontology",
  "url": "https://datagov-cz.github.io/cache-slovniku/time.ttl",
}, {
  "identifier": "vcard",
  "label": "vCard Ontology",
  "url": "https://www.w3.org/2006/vcard/ns#",
}, {
  "identifier": "sgov",
  "label": "Czech Semantic Vocabulary (SGOV)",
  "alias": "SGOV",
}];

/**
 * Represent a model that can be added from a list.
 */
export interface PredefinedModel {

  /**
   * Model identifier.
   */
  identifier: string;

  /**
   * Human visible label in the model list.
   */
  label: string;

  /**
   * Optional value used as an alias for the model.
   * If missing label is used instead.
   */
  alias?: string;

  /**
   * Optional URL to add model from.
   */
  url?: string;

}

export enum TabType {
  AddFromUrl = 0,
  AddPredefined = 1,
  CreateLocal = 2
}

export interface CreateModelState {

  activeTab: TabType;

  // "AddFromUrl" and "CreateLocal".

  modelUrl: string;

  modelAlias: string;

  // "AddPredefined".

  predefinedModels: PredefinedModel[];

  selectedModels: PredefinedModel[];

}

const DEFAULT_URL = "https://www.w3.org/ns/dcat3.ttl";

const DEFAULT_ALIAS = "dcat";

export function createCreateModelState(): CreateModelState {
  return {
    activeTab: TabType.AddPredefined,
    modelUrl: DEFAULT_URL,
    modelAlias: DEFAULT_ALIAS,
    predefinedModels: [...PREDEFINED_MODELS],
    selectedModels: [],
  };
}

export interface CreateModelControllerType {

  setActiveTab: (next: TabType) => void;

  setModelUrl: (next: string) => void;

  setModelAlias: (next: string) => void;

  toggleSelection: (model: PredefinedModel) => void;

}

export function useCreateModelController(
  { state, changeState }: DialogProps<CreateModelState>,
): CreateModelControllerType {
  return useMemo(() => {

    const setActiveTab = (next: TabType) => {
      changeState({ ...state, activeTab: next });
    };

    const setModelUrl = (next: string) => {
      changeState({ ...state, modelUrl: next });
    };

    const setModelAlias = (next: string) => {
      changeState({ ...state, modelAlias: next });
    };

    const toggleSelection = (model: PredefinedModel) => {
      const index = state.selectedModels.indexOf(model);
      if (index === -1) {
        changeState({
          ...state,
          selectedModels: [...state.selectedModels, model]
        });
      } else {
        changeState({
          ...state,
          selectedModels: [
            ...state.selectedModels.slice(0, index),
            ...state.selectedModels.slice(index + 1),
          ],
        });
      }
    };

    return {
      setActiveTab,
      setModelUrl,
      setModelAlias,
      toggleSelection,
    };
  }, [state, changeState]);
}
