import { LOCAL_PACKAGE, LOCAL_VISUAL_MODEL, LOCAL_SEMANTIC_MODEL, API_SPECIFICATION_MODEL, APPLICATION_GRAPH } from "@dataspecer/core-v2/model/known-models";

export type ResourceTypes = typeof LOCAL_PACKAGE |
  typeof LOCAL_VISUAL_MODEL |
  typeof LOCAL_SEMANTIC_MODEL |
  typeof API_SPECIFICATION_MODEL |
  typeof APPLICATION_GRAPH |
  "http://dataspecer.com/resources/v1/cim" |
  "http://dataspecer.com/resources/v1/generator-configuration" |
  "http://dataspecer.com/resources/v1/pim" |
  "http://dataspecer.com/resources/v1/psm" |
  "https://dataspecer.com/core/model-descriptor/sgov" |
  "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";

export const resourceTypeToTypeDirectoryMapping: Readonly<Record<ResourceTypes, string>> = Object.freeze({
  "http://dataspecer.com/resources/local/package": "directories",
  "http://dataspecer.com/resources/local/visual-model": "visual-models",
  "http://dataspecer.com/resources/local/semantic-model": "semantic-models",
  "http://dataspecer.com/resources/local/api-specification": "api-specifications",
  "http://dataspecer.com/resources/local/application-graph": "application-graphs",
  "http://dataspecer.com/resources/v1/cim": "cims",
  "http://dataspecer.com/resources/v1/generator-configuration": "generator-configurations",
  "http://dataspecer.com/resources/v1/pim": "pims",
  "http://dataspecer.com/resources/v1/psm": "psms",
  "https://dataspecer.com/core/model-descriptor/sgov": "sgovs",
  "https://dataspecer.com/core/model-descriptor/pim-store-wrapper": "pim-wrappers",
});
