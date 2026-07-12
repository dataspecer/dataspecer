import express from "express";
import { asyncHandler } from "../utils/async-handler.ts";
import { PackageExporter } from "../export-import/export.ts";
import { modelRepository } from "../main.ts";
import z from "zod";
import { PackageImporter } from "../export-import/import.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { getContentDispositionAttachmentHeaderValue, safeAsciiFileName, safeUnicodeFileName } from "../utils/safe-file-name.ts";

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

  const exporter = new PackageExporter(modelRepository);
  const buffer = await exporter.doExport(query.iri);

  const resource = await modelRepository.getResource(query.iri);
  const filename = getName(resource?.userMetadata?.label, "package");

  const ascii = safeAsciiFileName(filename, "dataspecer-project") + "-backup.zip";
  const unicode = safeUnicodeFileName(filename, "dataspecer-project") + "-backup.zip";
  response.header("Content-Disposition", getContentDispositionAttachmentHeaderValue(ascii, unicode));
  // Express's res.attachment() method does not work with Unicode names properly

  response.type("application/zip").send(buffer);
});

export const importPackageResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const file = request.file!.buffer;

  const importer = new PackageImporter(modelRepository);
  const imported = await importer.doImport(file);

  response.send(await Promise.all(imported.map(iri => modelRepository.getPackage(iri))));
});