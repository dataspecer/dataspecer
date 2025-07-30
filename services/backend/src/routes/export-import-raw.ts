import express from "express";
import { asyncHandler } from "../utils/async-handler.ts";
import { PackageExporter } from "../export-import/export.ts";
import { resourceModel } from "../main.ts";
import z from "zod";
import { PackageImporter } from "../export-import/import.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
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
  });

  const query = querySchema.parse(request.query);

  const exporter = new PackageExporter(resourceModel);
  const buffer = await exporter.doExport(query.iri);

  const resource = await resourceModel.getResource(query.iri);
  const filename = getName(resource?.userMetadata?.label, "package") + "-backup.zip";
  response.type("application/zip").attachment(bunHotfixHttpFileName(filename)).send(buffer);
});

export const importPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const file = request.file!.buffer;

  const importer = new PackageImporter(resourceModel);
  const imported = await importer.doImport(file);

  response.send(await Promise.all(imported.map(iri => resourceModel.getPackage(iri))));
});