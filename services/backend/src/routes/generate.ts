import { CoreResourceReader } from "@dataspecer/core/core/core-reader";
import { LanguageString } from "@dataspecer/core/core/index";
import { InputStream } from "@dataspecer/core/io/stream/input-stream";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import { DefaultArtifactBuilder } from "@dataspecer/specification/v1";
import express from "express";
import { z } from "zod";
import configuration from "../configuration.ts";
import { ZipStreamDictionary } from "../utils/zip-stream-dictionary.ts";
import { modelRepository, transactionModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { getContentDispositionAttachmentHeaderValue, safeAsciiFileName, safeUnicodeFileName } from "../utils/safe-file-name.ts";
import { getModelsForPackage } from "../utils/backend-model-store.ts";

function getName(name: LanguageString | undefined, defaultName: string) {
  return name?.["cs"] || name?.["en"] || defaultName;
}

class SingleFileStreamDictionary implements StreamDictionary {
  requestedFileContents: string | Blob | null = null;
  constructor(private requestedFile: string) {}
  readPath(): InputStream {
    throw new Error("Method not implemented.");
  }
  exists(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  list(): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  writePath(path: string) {
    return {
      write: async (data: string | Blob) => {
        if (path === this.requestedFile) {
          if (data instanceof Blob) {
            this.requestedFileContents = data;
          } else {
            if (this.requestedFileContents === null) {
              this.requestedFileContents = "";
            }
            this.requestedFileContents += data;
          }
        }
      },
      close: () => Promise.resolve(),
    };
  }
}

/**
 * The main method to generate everything for a given package into a stream dictionary.
 */
async function generateArtifacts(
  packageIri: string,
  streamDictionary: StreamDictionary,
  queryParams: string = "",
  singleFilePath: string | null = null,
) {
  const allModels = await getModelsForPackage(packageIri, modelRepository);

  const { store, dataSpecifications } = getDataSpecificationWithModels(packageIri, allModels);
  const generator = new DefaultArtifactBuilder(store as CoreResourceReader, dataSpecifications, configuration.configuration, fetch, allModels);
  generator.singleSpecificationOnly = true; // We want to generate only a single specification without extra directories.

  // The recorded transaction history (with the versions marked in it) is
  // published as the LDES stream of the specification. The models start empty
  // and are replayed from the history - faithful for projects whose whole
  // content is recorded; projects predating the history keep the fallback of
  // publishing their current state as a single initial transaction.
  const historyTransactions = await transactionModel.getBranchHistory(packageIri);
  if (historyTransactions.length > 0) {
    generator.history = {
      models: {},
      transactions: historyTransactions.map((transaction) => ({
        id: transaction.clientId,
        time: transaction.createdAt.toISOString(),
        operations: transaction.operations,
      })),
    };
  }
  await generator.prepare(Object.keys(dataSpecifications), undefined, queryParams);
  await generator.build(streamDictionary, singleFilePath, queryParams, packageIri);
}

export const getZip = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const resource = await modelRepository.getPackage(query.iri);

  if (!resource) {
    response.status(404).send({ error: "Package does not exist." });
    return;
  }

  const zip = new ZipStreamDictionary();

  await generateArtifacts(query.iri, zip);

  // Send zip file
  const filename = getName(resource?.userMetadata?.label, "export");

  const ascii = safeAsciiFileName(filename, "export") + ".zip";
  const unicode = safeUnicodeFileName(filename, "export") + ".zip";
  response.header("Content-Disposition", getContentDispositionAttachmentHeaderValue(ascii, unicode));
  // Express's res.attachment() method does not work with Unicode names properly

  response.type("application/zip").send(await zip.save());
  return;
});

export const getSingleFile = asyncHandler(async (request: express.Request, response: express.Response) => {
  // The path does not start with slash.
  const splat = request.params.splat;
  let path = Array.isArray(splat) ? splat.join("/") : "";
  if (path === "") {
    path = "index.html";
  }

  const querySchema = z.object({
    iri: z.string().min(1),
    // raw that anything non undefined is true
    raw: z
      .string()
      .optional()
      .transform((value) => value !== undefined)
      .pipe(z.boolean()),
  });
  const query = querySchema.parse(request.query);
  const resource = await modelRepository.getPackage(query.iri);
  if (!resource) {
    response.status(404).send({ error: "Package does not exist." });
    return;
  }

  const streamDictionary = new SingleFileStreamDictionary(path);
  await generateArtifacts(
    query.iri,
    streamDictionary,
    query.raw ? "" : "?iri=" + encodeURIComponent(query.iri),
    path,
  );

  if (streamDictionary.requestedFileContents === null) {
    response.status(404).send({ error: "File not found." });
    return;
  } else {
    const type = path.split(".").pop() ?? "";
    switch (type) {
      case "html":
        response.type("text/html");
        break;
      case "ttl":
        response.type("text/turtle");
        break;
      case "svg":
        response.type("image/svg+xml");
        break;
      default:
        response.type("text/plain");
    }
    // The requested file content can be a blob
    if (streamDictionary.requestedFileContents instanceof Blob) {
      response.send(await streamDictionary.requestedFileContents.text());
      return;
    } else {
      response.send(streamDictionary.requestedFileContents);
      return;
    }
  }
});
