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
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import { BackendModelRepository } from "../utils/model-repository.ts";


interface DataSpecifications {
  [key: string]: any;
}

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
export async function generateArtifacts(
  packageIri: string,
  streamDictionary: StreamDictionary,
  queryParams: string = "",
  singleFilePath: string | null = null,
) {
  const modelRepository = new BackendModelRepository(resourceModel);

  const { store, dataSpecifications } = await getDataSpecificationWithModels(packageIri, "", modelRepository);
  const generator = new DefaultArtifactBuilder(store as CoreResourceReader, dataSpecifications, configuration.configuration, fetch, modelRepository);
  generator.singleSpecificationOnly = true; // We want to generate only a single specification without extra directories.
  await generator.prepare(Object.keys(dataSpecifications), undefined, queryParams);
  await generator.build(streamDictionary, singleFilePath, queryParams, packageIri);
}

export const getZip = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const resource = await resourceModel.getPackage(query.iri);

  if (!resource) {
    response.status(404).send({ error: "Package does not exist." });
    return;
  }

  const zip = new ZipStreamDictionary();

  await generateArtifacts(query.iri, zip);

  // Send zip file
  const filename = getName(resource?.userMetadata?.label, "export") + ".zip";
  response.type("application/zip").attachment(filename).send(await zip.save());
  return;
});

export const getSingleFile = asyncHandler(async (request: express.Request, response: express.Response) => {
  // The path does not start with slash.
  let path = request.params[0];
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
  const resource = await resourceModel.getPackage(query.iri);
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
