import { AvailableFilesystems } from "@dataspecer/git";
import { AvailableExports, AllowedExportResults } from "./export-actions.ts";
import { resourceTypeToTypeDirectoryMapping } from "../../../../packages/git/lib/resource-types.js";


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

const typeExportArtificialDirectories = Object.values(resourceTypeToTypeDirectoryMapping);

export function isArtificialExportDirectory(directoryName: string): boolean {
  return typeExportArtificialDirectories.includes(directoryName);
}
