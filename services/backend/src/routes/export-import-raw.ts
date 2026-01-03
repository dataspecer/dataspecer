import express from "express";
import { asyncHandler } from "../utils/async-handler.ts";
import { prismaClient, resourceModel, storeModel } from "../main.ts";
import z from "zod";
import { PackageImporter } from "../export-import/import.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { PackageExporterByResourceType } from "../export-import/export-by-resource-type.ts";
import { AvailableExports } from "../export-import/export-actions.ts";
import { AvailableFilesystems } from "@dataspecer/git";
import { PackageExporterNew } from "../export-import/export-new.ts";
import { bunHotfixHttpFileName } from "./generate.ts";

function getName(name: LanguageString | undefined, defaultName: string) {
  return name?.["cs"] || name?.["en"] || defaultName;
}

/**
 * Exports whole package as a zip.
 */
export const exportPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    exportFormat: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);

  // TODO RadStr After: ... maybe keep the old one?
  // The old exporter:
  // const exporter = new PackageExporterDeprecated(resourceModel);
  // const buffer = await exporter.doExport(query.iri);
  // const exporter = new PackageExporterNew();
  const exporter = new PackageExporterByResourceType();
  const buffer = await exporter.doExportFromIRI(
    query.iri, "", "", AvailableFilesystems.DS_Filesystem, AvailableExports.Zip,
    query.exportFormat ?? "json", resourceModel, null);

  // const exporter = new PackageExporterByResourceType();
  // const buffer = await exporter.doExportFromIRI(query.iri, "", `radstr/export/directory`, AvailableFilesystems.DS_Filesystem, AvailableExports.Zip, query.exportFormat ?? "json", null);
  // TODO RadStr: Debug exporters ... maybe can use in tests (with non-local paths of course).
  // const buffer = await exporter.doExportFromIRI(query.iri);
  // const buffer = await exporter.doExportFromIRI(query.iri, "", `radstr/export/directory`, AvailableFilesystems.DS_Filesystem, AvailableExports.Zip);
  // const buffer = await exporter.doExportFromIRI("aa99f378-0ba2-46a2-8642-f7683e778d6d", "C:\\Users\\Radek\\dcat-test-export-from-filesystem\\test2\\radstr\\export\\directory", "radstr\\export\\directory", AvailableFilesystems.ClassicFilesystem, AvailableExports.Zip);
  // const buffer = await exporter.doExportFromIRI("aa99f378-0ba2-46a2-8642-f7683e778d6d", "C:\\Users\\Radek\\dcat-test-export-from-filesystem\\test2\\radstr\\export\\directory", "C:\\Users\\Radek\\dcat-test-export-from-filesystem\\test2\\filesystem-output-from-radstr", AvailableFilesystems.ClassicFilesystem, AvailableExports.Filesystem);

  const resource = await resourceModel.getResource(query.iri);
  const filename = getName(resource?.userMetadata?.label, "package") + "-backup.zip";
  response.type("application/zip").attachment(bunHotfixHttpFileName(filename)).send(buffer);
});

export const importPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const file = request.file!.buffer;

  const importer = new PackageImporter(resourceModel, storeModel, prismaClient);
  const imported = await importer.doImport(file, false);

  response.send(await Promise.all(imported.map(iri => resourceModel.getPackage(iri))));
});
