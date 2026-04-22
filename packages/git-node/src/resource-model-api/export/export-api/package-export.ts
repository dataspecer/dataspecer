import { AvailableFilesystems } from "@dataspecer/git";
import { AllowedExportResults, AvailableExports } from "./export-actions.ts";
import { FilesystemFactoryMethodParams } from "../../../filesystem-abstractions/backend-filesystem-abstraction-factory.ts";

/**
 * Use the {@link PackageExporterBase} as base class for implementation of new exporters.
 *  Note that there are some quirks in implementation. The biggest (and maybe only) one being setting "_exportVersion" in the meta of root resource.
 *  For simplicity and consistency we update the value for each exported meta file.
 */
export interface PackageExporterInterface {
  /**
   * @param iriMapping If not undefined then each datastores (only the content) gets iri replacement using the given {@link iriMapping}.
   * @param gitIgnore in the {@link filesystemFactoryParams} can be null for DS-filesystem
   * @param shouldUseIrisAsNames if false then it uses projectIris as filenames instead.
   */
  doExportFromIRI(
    filesystemFactoryParams: FilesystemFactoryMethodParams,
    pathToExportStartDirectory: string,
    importFilesystem: AvailableFilesystems,
    exportType: AvailableExports,
    exportFormat: string,
    shouldRemoveExportedAt: boolean,
    shouldUseIrisAsNames: boolean,
    iriMapping?: Record<string, string>,
  ): Promise<AllowedExportResults>;

  getExportVersion(): number;
}
