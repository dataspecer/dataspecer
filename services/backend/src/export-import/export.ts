import { LOCAL_PACKAGE, LOCAL_VISUAL_MODEL, LOCAL_SEMANTIC_MODEL, API_SPECIFICATION_MODEL, APPLICATION_GRAPH } from "@dataspecer/core-v2/model/known-models";
import { AvailableFilesystems } from "@dataspecer/git";
import { AvailableExports, AllowedExportResults } from "./export-actions.ts";


/**
 * Use the {@link PackageExporterBase} as base class for implementation of new exporters.
 *  Note that there are some quirks in implementation. The biggest (and maybe only) one being setting "_exportVersion" in the meta of root resource.
 *  For simplicity and consistency we update the value for each exported meta file.
 */
export interface PackageExporterInterface {
  doExportFromIRI(
    iri: string,
    directory: string,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports,
    exportFormat: string
  ): Promise<AllowedExportResults>;

  getExportVersion(): number;
}


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

export const resourceTypetoTypeDirectoryMapping: Record<ResourceTypes, string> = {
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
};
const typeExportArtificialDirectories = Object.values(resourceTypetoTypeDirectoryMapping);

export function isArtificialExportDirectory(directoryName: string): boolean {
  return typeExportArtificialDirectories.includes(directoryName);
}
