import express from "express";
import { asyncHandler } from "../utils/async-handler.ts";
import { PackageExporter } from "../export-import/export.ts";
import { modelRepository } from "../main.ts";
import z from "zod";
import { PackageImporter } from "../export-import/import.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { getContentDispositionAttachmentHeaderValue, safeAsciiFileName, safeUnicodeFileName } from "../utils/safe-file-name.ts";
import { BackupVersionTooNewError } from "../migration-utils/migrate-backup.ts";

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
  let imported: string[];
  try {
    imported = await importer.doImport(file);
  } catch (error) {
    if (error instanceof BackupVersionTooNewError) {
      response.status(400).json({
        code: error.code,
        error: "This backup file was generated with a newer version of Dataspecer and cannot be imported. Consider updating your version of Dataspecer.",
      });
      return;
    }
    throw error;
  }

  response.send(await Promise.all(imported.map(iri => modelRepository.getPackage(iri))));
});
