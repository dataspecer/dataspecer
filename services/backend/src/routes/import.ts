import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import {
  isSemanticModelClass,
  isSemanticModelRelationPrimitive,
  isSemanticModelRelationship,
  LanguageString,
  SemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { conceptualModelToEntityListContainer, rdfToConceptualModel } from "@dataspecer/data-specification-vocabulary";
import { DataTypeURIs, isDataType } from "@dataspecer/core-v2/semantic-model/datatypes";
import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { isSemanticModelRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { PROF } from "@dataspecer/specification/dsv";
import express from "express";
import * as jsonld from "jsonld";
import N3, { Quad_Object } from "n3";
import { parse } from "node-html-parser";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { resourceModel } from "../main.ts";
import { BaseResource } from "../models/resource-model.ts";
import { asyncHandler } from "./../utils/async-handler.ts";
import { PackageImporter } from "../export-import/import.ts";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { buffer } from "stream/consumers";
import { CommitReferenceType, getDefaultCommitReferenceTypeForZipDownload, GitProvider, GitProviderFactory, isCommitReferenceType } from "../git-providers/git-provider-api.ts";
import { updateGitRelatedDataForPackage } from "./link-to-existing-remote-git-repo.ts";

function jsonLdLiteralToLanguageString(literal: Quad_Object[]): LanguageString {
  const result: LanguageString = {};
  if (literal) {
    for (const entry of literal) {
      if (entry.termType === "Literal" && entry.language) {
        result[entry.language] = entry.value;
      }
    }
  }
  return result;
}

async function importRdfsModel(parentIri: string, url: string, newIri: string, userMetadata: any): Promise<SemanticModelEntity[]> {
  await resourceModel.createResource(parentIri, newIri, "https://dataspecer.com/core/model-descriptor/pim-store-wrapper", userMetadata);
  const store = await resourceModel.getOrCreateResourceModelStore(newIri);
  const wrapper = await createRdfsModel([url], httpFetch);
  const serialization = await wrapper.serializeModel();
  serialization.id = newIri;
  serialization.alias = userMetadata?.label?.en ?? userMetadata?.label?.cs;
  await store.setJson(serialization);
  return Object.values(wrapper.getEntities()) as SemanticModelEntity[];
}

/**
 * Splits IRI into prefix and local name.
 * If invalid, only local name is returned.
 */
function splitIri(iri: string | null | undefined): [string, string] {
  if (!iri) {
    return ["", ""];
  }
  const separator = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
  if (separator === -1) {
    return ["", iri];
  }
  return [iri.substring(0, separator + 1), iri.substring(separator + 1)];
}

async function importRdfsAndDsv(parentIri: string, rdfsUrl: string | null, dsvUrl: string | null, userMetadata: any, allImportedEntities: SemanticModelEntity[]) {
  async function createModelFromEntities(entities: SemanticModelEntity[], id: string, userMetadata: any) {
    await resourceModel.createResource(parentIri, id, LOCAL_SEMANTIC_MODEL, userMetadata);
    const store = await resourceModel.getOrCreateResourceModelStore(id);

    // Manage prefixes
    const prefixesCount: Record<string, number> = {};
    for (const entity of entities) {
      const [prefix] = splitIri(entity.iri);
      if (prefix) {
        prefixesCount[prefix] = (prefixesCount[prefix] ?? 0) + 1;
      }

      if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipUsage(entity)) {
        for (const end of entity.ends) {
          const [prefix] = splitIri(end.iri);
          if (prefix) {
            prefixesCount[prefix] = (prefixesCount[prefix] ?? 0) + 1;
          }
        }
      }
    }
    let bestPrefix = null;
    let bestPrefixCount = 0;
    for (const [prefix, count] of Object.entries(prefixesCount)) {
      if (count > bestPrefixCount) {
        bestPrefix = prefix;
        bestPrefixCount = count;
      }
    }
    if (bestPrefix) {
      for (const entity of entities as SemanticModelEntity[]) {
        if (entity.iri && entity.iri.startsWith(bestPrefix)) {
          entity.iri = entity.iri.substring(bestPrefix.length);
        }
        if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipUsage(entity)) {
          for (const end of entity.ends) {
            if (end.iri && end.iri.startsWith(bestPrefix)) {
              end.iri = end.iri.substring(bestPrefix.length);
            }
          }
        }
      }
    }

    const result = {
      modelId: id,
      modelAlias: userMetadata?.label?.en ?? userMetadata?.label?.cs,
      entities: Object.fromEntries(entities.map((e) => [e.id, e])),
      baseIri: bestPrefix,
    } as any;

    await store.setJson(result);
  }

  /**
   * We import entities identified by their IRIs and store them with their IDs.
   */
  const knownMapping: Record<string, string> = {};
  for (const datatype of DataTypeURIs) {
    knownMapping[datatype] = datatype;
  }

  // Vocabulary

  let vocabularyEntities: SemanticModelEntity[] = [];
  if (rdfsUrl) {
    const wrapper = await createRdfsModel([rdfsUrl], httpFetch);
    const serialization = wrapper.serializeModel();
    const model = new PimStoreWrapper(serialization.pimStore, serialization.id, serialization.alias, serialization.urls);
    model.fetchFromPimStore();

    for (const entity of Object.values(model.getEntities())) {
      if (isSemanticModelClass(entity)) {
        knownMapping[entity.iri!] = entity.id;
      }
      if (isSemanticModelRelationship(entity)) {
        if (entity.iri) {
          knownMapping[entity.iri!] = entity.id;
        }
        for (const end of entity.ends) {
          if (end.iri) {
            knownMapping[end.iri!] = entity.id;
          }
        }
      }
    }

    vocabularyEntities = Object.values(model.getEntities()) as SemanticModelEntity[];
  }
  allImportedEntities.push(...vocabularyEntities.map((e) => ({ ...e }))); // We need to clone because the following function modifies iris
  if (vocabularyEntities.length > 0) {
    await createModelFromEntities(vocabularyEntities, parentIri + "/" + "vocabulary", userMetadata);
  }

  // DSV

  let profileEntities: SemanticModelEntity[] = [];
  if (dsvUrl) {
    const response = await fetch(dsvUrl);
    const data = await response.text();
    const conceptualModel = await rdfToConceptualModel(data);
    const dsvResult = conceptualModelToEntityListContainer(conceptualModel[0], {
      iriToIdentifier: (iri) => knownMapping[iri] ?? iri,
      iriPropertyToIdentifier(iri, rangeConcept) {
        const isPrimitive = isDataType(rangeConcept);
        const candidate = allImportedEntities.filter(isSemanticModelRelationship).find((e) => e.ends[1].iri === iri && isSemanticModelRelationPrimitive(e) === isPrimitive);
        if (candidate) {
          return candidate.id;
        }
        return knownMapping[iri] ?? iri;
      },
    });

    profileEntities = dsvResult.entities as SemanticModelEntity[];
  }
  if (profileEntities.length > 0) {
    await createModelFromEntities(profileEntities, parentIri + "/" + "profile", userMetadata);
  }
}

/**
 * @deprecated drop support anytime it would require changes
 */
async function legacyDsvImport(store: N3.Store, url: string, baseIri: string, parentIri: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  const name = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://purl.org/dc/terms/title", null));
  const description = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://www.w3.org/2000/01/rdf-schema#comment", null));

  // Create package
  const newPackageIri = parentIri + "/" + uuidv4();
  const pkg = await resourceModel.createPackage(parentIri, newPackageIri, {
    label: name,
    description,
    importedFromUrl: url,
    documentBaseUrl: url,
  });

  let rdfsUrl = null;
  let dsvUrl = null;

  const artefacts = [
    ...store.getObjects(baseIri, "https://w3id.org/dsv#artefact", null), // TODO: remove when every known specification contains prof:hasResource
    ...store.getObjects(baseIri, "http://www.w3.org/ns/dx/prof/hasResource", null),
  ];

  for (const artefact of artefacts) {
    const artefactUrl = store.getObjects(artefact, "http://www.w3.org/ns/dx/prof/hasArtifact", null)[0].id;
    const role = store.getObjects(artefact, "http://www.w3.org/ns/dx/prof/hasRole", null)[0].id;

    if (role === "http://www.w3.org/ns/dx/prof/role/vocabulary") {
      rdfsUrl = artefactUrl;
    } else if (role === "http://www.w3.org/ns/dx/prof/role/schema") {
      dsvUrl = artefactUrl;
    }
  }

  const vocabularies = [
    ...new Set([
      ...store.getObjects(baseIri, "https://w3id.org/dsv#usedVocabularies", null).map((v) => v.id), // TODO: remove when every known specification contains prof:isProfileOF
      ...store.getObjects(baseIri, "http://purl.org/dc/terms/references", null).map((v) => v.id), // TODO: remove when every known specification contains prof:isProfileOF
      ...store.getObjects(baseIri, "http://www.w3.org/ns/dx/prof/isProfileOf", null).map((v) => v.id),
    ]),
  ];
  const entities: SemanticModelEntity[] = [];
  for (const vocabularyId of vocabularies) {
    const urlToImport = vocabularyId;
    const [, e] = await importFromUrl(newPackageIri, urlToImport);
    entities.push(...e);
  }

  await importRdfsAndDsv(
    newPackageIri,
    rdfsUrl,
    dsvUrl,
    {
      label: {
        en: name.en ?? name.cs,
      },
      documentBaseUrl: url,
    },
    entities,
  );

  return [(await resourceModel.getResource(newPackageIri))!, entities];
}

async function dsvImport(store: N3.Store, url: string, baseIri: string, parentIri: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  // Find the core model
  const coreSubjects = store.getSubjects("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", PROF.Profile, null);

  const coreId = coreSubjects[0].id;

  const name = jsonLdLiteralToLanguageString(store.getObjects(coreId, "http://purl.org/dc/terms/title", null));
  const description = jsonLdLiteralToLanguageString(store.getObjects(coreId, "http://www.w3.org/2000/01/rdf-schema#comment", null));

  // Create package
  const newPackageIri = parentIri + "/" + uuidv4();
  const pkg = await resourceModel.createPackage(parentIri, newPackageIri, {
    label: name,
    description,
    importedFromUrl: url,
    documentBaseUrl: url,
  });

  const resources = store.getObjects(coreId, PROF.hasResource, null);

  let rdfsUrl = null;
  let dsvUrl = null;
  for (const resource of resources) {
    if (resource.id.startsWith('"')) {
      // todo There is this weird bug where one resource contains parenthesis
      continue;
    }

    const role = store.getObjects(resource, PROF.hasRole, null)[0].id;
    const artefactUrl = store.getObjects(resource.id, PROF.hasArtifact, null)[0].id;

    if (role === PROF.ROLE.Vocabulary) {
      rdfsUrl = artefactUrl;
    } else if (role === PROF.ROLE.Specification) {
      dsvUrl = artefactUrl;
    }
  }

  const entities: SemanticModelEntity[] = [];
  for (const profile of store.getObjects(coreId, PROF.isProfileOf, null)) {
    const urlToImport = store.getObjects(profile, PROF.hasArtifact, null)[0].id;
    const [, e] = await importFromUrl(newPackageIri, urlToImport);
    entities.push(...e);
  }

  await importRdfsAndDsv(
    newPackageIri,
    rdfsUrl,
    dsvUrl,
    {
      label: {
        en: name.en ?? name.cs,
      },
      documentBaseUrl: url,
    },
    entities,
  );

  return [(await resourceModel.getResource(newPackageIri))!, entities];
}

/**
 * Imports from URL and creates either a package or PIM model.
 */
export async function importFromUrl(parentIri: string, url: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  url = url.replace(/#.*$/, "");

  // const baseIri = url;
  const baseIri = url;

  // Load the URL
  const queryResponse = await fetch(url);
  if (!queryResponse.ok) {
    throw new Error("Failed to fetch the URL: " + queryResponse.statusText);
  }
  if (queryResponse.headers.get("content-type")?.includes("text/html")) {
    const queryText = await queryResponse.text();
    const html = parse(queryText);
    const jsonLdText = html.querySelector('script[type="application/ld+json"]')?.innerHTML ?? "{}";
    const jsonLd = await jsonld.expand(JSON.parse(jsonLdText), {
      base: baseIri,
    });
    const nquads = await jsonld.toRDF(jsonLd, { format: "application/n-quads" });
    const parser = new N3.Parser({ format: "N-Triples", baseIRI: baseIri });
    const store = new N3.Store();
    store.addQuads(parser.parse(nquads as string));

    if (store.getObjects(baseIri, "https://w3id.org/dsv#artefact", null).length > 0) {
      // This is a legacy DSV model
      return legacyDsvImport(store, url, baseIri, parentIri);
    } else {
      return dsvImport(store, url, baseIri, parentIri);
    }
  } else {
    // Generate name
    let chunkToParse = url;
    try {
      chunkToParse = new URL(url).pathname;
    } catch (error) {}

    const chunks = chunkToParse.split("/");
    const section = chunks.pop() || chunks.pop() || "unnamed"; // handle potential trailing slash
    const name = section.split(".")[0];

    return [
      null,
      await importRdfsModel(parentIri, url, parentIri + "/" + uuidv4(), {
        documentBaseUrl: url,
        ...(name ? { label: { en: name } } : {}),
      }),
    ];
  }
}

/**
 * Import: Import endpoint is a wizard that allows you to import specific package/model from a remote source.
 */
export const importResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    // Parent package IRI
    parentIri: z.string().min(1),
    // Url from which to import the resource
    url: z.string().url(),
  });

  const query = querySchema.parse(request.query);

  const [result] = await importFromUrl(query.parentIri, query.url);

  response.send(result);
  return;
});


/**
 * Generates specification from git URL passed in as argument from command line
 * @param repositoryURL is the URL of git repository (method also supports non-main branch URLs),
 *  this URL is transformed to the URL which downloads zip - for example https://github.com/RadStr-bot/4f21bf6d-2116-4ab3-b387-1f8074f7f412/archive/refs/heads/main.zip
 * @param commitReferenceType if not provided it just fallbacks to defaults
 */
export async function importFromGitUrl(repositoryURL: string, commitReferenceType?: CommitReferenceType) {
  const gitProvider: GitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(repositoryURL);
  // TODO RadStr: If there will be some issues with the defaults when importing from git, then
  // TODO RadStr: we can clone the repository and do some git actions to find out what type of reference it is
  const commitReferenceTypeForZip = commitReferenceType === undefined ? getDefaultCommitReferenceTypeForZipDownload() : commitReferenceType;
  const gitZipDownloadURLData = await gitProvider.convertRepoURLToDownloadZipURL(repositoryURL, commitReferenceTypeForZip);
  if (gitZipDownloadURLData.commitReferenceValueInfo.fallbackToDefaultBranch) {
    commitReferenceType = "branch";
  }
  // Just a note that commitReferenceType still might be undefiend here

  console.info("gitDownloadURL", repositoryURL);

  // https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
  // and https://medium.com/deno-the-complete-reference/download-file-with-fetch-in-node-js-57dd370c973a
  // TODO RadStr: Using fetch instead of internal httpFetch, since that one does not support zip files
  const downloadZipResponse = await fetch(gitZipDownloadURLData.zipURL, {
    method: "GET",
  });
  if (!downloadZipResponse.ok || downloadZipResponse.body === null) {
    throw new Error(`Failed to fetch ${gitZipDownloadURLData}`);
  }

  // TODO RadStr: Remove the commented lines here - this is the old variant where we first put the file into filesystem and then load the zip file
  //// It is tmp-dir since it is not part of the generated directory, therefore it won't be pushed to the publication repo, because we won't "mv" it
  // const zipFromGitDownloadPathInFS = "tmp-dir";     // TODO RadStr: Ideally this should be in some file or something or have templates for gh actions. Because now I have to put the filepath on 2 places
  // if(!fs.existsSync(zipFromGitDownloadPathInFS)) {
  //   fs.mkdirSync(zipFromGitDownloadPathInFS, { recursive: true });
  // }
  // // Also when we use .toPipe(downloadZipFile), it does not return any promise to await for, so we have to use pipeline or listen to events on downloadZipFile
  // const downloadZipPath = `${zipFromGitDownloadPathInFS}/temporary-zip-file.zip`;
  // const donwloadZipFile = fs.createWriteStream(downloadZipPath);
  // const zipPipeline = await pipeline(Readable.fromWeb(downloadZipResponse.body as ReadableStream<any>), donwloadZipFile);
  // const zipBuffer = fs.readFileSync(downloadZipPath);


  // TODO RadStr: Dont really understand why do I have to recast to <any> if I have clearly more specific type
  const webReadableStream = Readable.fromWeb(downloadZipResponse.body as ReadableStream<any>);
  // Create buffer from them stream, no need to touch filesystem.
  const zipBuffer: Buffer = await buffer(webReadableStream);


  const importer = new PackageImporter(resourceModel);

  const commitReferenceValue =  gitZipDownloadURLData.commitReferenceValueInfo.commitReferenceValue;
  const rootIriSuffix = commitReferenceValue === null ? "" : `-${commitReferenceValue}`;

  const imported = await importer.doImport(zipBuffer, rootIriSuffix);

  if (imported.length > 0) {
    await updateGitRelatedDataForPackage(imported[0], gitProvider, repositoryURL, gitZipDownloadURLData.commitReferenceValueInfo.commitReferenceValue, commitReferenceType);
  }

  return imported;
}

/**
 * Import: Import Git endpoint is a wizard that allows you to import specific package from a remote git repository.
 */
export const importPackageFromGit = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    // Parent package IRI
    parentIri: z.string().min(1),
    // Url from which to import the resource
    gitURL: z.string().url(),
    // Is either of CommitReferenceType or not provided
    commitReferenceType: z.string().min(0).optional(),
  });

  const query = querySchema.parse(request.query);

  const commitReferenceType = query.commitReferenceType;

  if (commitReferenceType !== undefined && !isCommitReferenceType(commitReferenceType)) {
    response.status(404).json(`Invalid commitReferenctType: ${commitReferenceType}`);
    return;
  }

  const [result] = await importFromGitUrl(query.gitURL, commitReferenceType);

  response.send(result);
  return;
});
