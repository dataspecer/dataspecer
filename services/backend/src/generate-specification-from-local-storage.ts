// import cors from "cors";
// import express, { NextFunction } from "express";
// import multer from "multer";
// import configuration from "./configuration.ts";
// import { Migrate } from "./migrations/migrate.ts";
// import { DataSpecificationModelAdapted } from "./models/data-specification-model-adapted.ts";
// import { LocalStoreModel } from "./models/local-store-model.ts";
// import { ResourceModel } from "./models/resource-model.ts";
// import { getDefaultConfiguration } from "./routes/configuration.ts";
// import { createDataPsm, deleteDataPsm } from "./routes/dataPsm.ts";
// import { getlightweightFromSimplified as getlightweightOwlFromSimplified } from "./routes/experimental.ts";
// import { getSingleFile, getZip } from "./routes/generate.ts";
// import { exportPackageResource, importPackageResource } from "./routes/export-import-raw.ts";
// import { getGenerateApplicationByModelId, getGeneratedApplication } from "./routes/genapp.ts";
// import { generate } from "./routes/generate.ts";
// import {
//   copyRecursively,
//   createPackageResource,
//   createResource,
//   deleteBlob,
//   deleteResource,
//   getBlob,
//   getPackageResource,
//   getResource,
//   getRootPackages,
//   updateBlobHandler,
//   updateResourceHandler,
// } from "./routes/resource.ts";
// import { getSimplifiedSemanticModel, setSimplifiedSemanticModel } from "./routes/simplified-semantic-model.ts";
// import {
//   addSpecification,
//   cloneSpecification,
//   consistencyFix,
//   deleteSpecification,
//   garbageCollection,
//   importSpecifications,
//   listSpecifications,
//   modifySpecification,
// } from "./routes/specification.ts";
// import { getSystemData } from "./routes/system.ts";
// import { useStaticSpaHandler } from "./static.ts";
// import { tryCommitToGitRepo } from "./routes/git-test.ts";
// import { createRandomWebook, handleWebhook } from "./routes/git-webhook-handler.ts";
// import { createLinkBetweenPackageAndGit, createPackageFromExistingGitRepository, removeGitRepository } from "./routes/create-package-git-link.ts";
// import { commitPackageToGit, commitPackageToGitHandler } from "./routes/commit-package-to-git.ts";



// // TODO RadStr: Authorization
// import { ExpressAuth, ExpressAuthConfig, getSession } from "@auth/express";
// import GitHub from "@auth/express/providers/github";
// import GitLab from "@auth/express/providers/gitlab";
// import { authHandler } from "./authorization/authorization-test.ts";
// import { AUTH_SECRET, GITHUB_AUTH_CLIENT_ID, GITHUB_AUTH_CLIENT_SECRET } from "./git-never-commit.ts";
// import { basicAuthConfig, createAuthConfigWithCorrectPermissions } from "./authorization/auth-config.ts";
// import { currentSession, getBasicUserInfo } from "./authorization/auth-session.ts";
// import { redirectToRemoteGitRepository } from "./routes/redirect-to-remote-git-repository.ts";






// import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
// import {
//   isSemanticModelClass,
//   isSemanticModelRelationPrimitive,
//   isSemanticModelRelationship,
//   LanguageString,
//   SemanticModelEntity,
// } from "@dataspecer/core-v2/semantic-model/concepts";
// import { conceptualModelToEntityListContainer, rdfToConceptualModel } from "@dataspecer/core-v2/semantic-model/data-specification-vocabulary";
// import { DataTypeURIs, isDataType } from "@dataspecer/core-v2/semantic-model/datatypes";
// import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
// import { isSemanticModelRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";
// import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
// import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
// import { PROF } from "@dataspecer/specification/dsv";

// import jsonld from "jsonld";    // TODO RadStr: For some reason we have to export it like this, otherwise the functions are not exported
// // import * as jsonld from "jsonld"; // TODO RadStr: This does not work


// // import { expand } from "jsonld";
// import N3, { Quad_Object } from "n3";
// import { parse } from "node-html-parser";
// import { v4 as uuidv4 } from "uuid";
// import z from "zod";
// import { generateSpecification } from "@dataspecer/specification";
// import { BackendModelRepository } from "./utils/model-repository.ts";
// import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
// import { ZipStreamDictionary } from "./generate/zip-stream-dictionary.ts";

// import fs from "fs";
// import { BaseResource } from "./models/resource-model.ts";
// import { asyncHandler } from "./utils/async-handler.ts";
// import { migratePR419 } from "./tools/migrate-pr419.ts";
// import { resourceModel } from "./main.ts";



// import * as m from "./main.ts";

// // // Create application models
// // const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
// // await delay(10000);

// // await httpFetch("http://localhost:3100/data-specification", {
// //   method: "GET",
// // });

// // const response = await httpFetch(`http://localhost:3100/resources/import?parentIri=${encodeURIComponent("http://dataspecer.com/packages/local-root")}&url=${encodeURIComponent("https://mff-uk.github.io/specifications/dcat-ap/")}`, {
// //   method: "GET",
// // });


// // await httpFetch("http://localhost:3100/resources/packages?iri=http%3A%2F%2Fdataspecer.com%2Fpackages%2Flocal-root", {
// //   method: "GET",
// // });
// // await httpFetch("http://localhost:3100/resources/packages?iri=http%3A%2F%2Fdataspecer.com%2Fpackages%2Fv1", {
// //   method: "GET",
// // });
// // await httpFetch("http://localhost:3100/resources/packages?iri=https%3A%2F%2Fdataspecer.com%2Fresources%2Fimport%2Flod", {
// //   method: "GET",
// // });


// console.info("jsonld", jsonld);
// console.info("jsonld", jsonld.toRDF);
// console.info("jsonld", jsonld.expand);


// // // const response = await httpFetch("http://localhost:3100/resources/import", {
// // //   method: "GET",
// // // });

// // console.info(response);
// // jsonld.expand(null as any, null as any, null as any);


// function jsonLdLiteralToLanguageString(literal: Quad_Object[]): LanguageString {
//   const result: LanguageString = {};
//   if (literal) {
//     for (const entry of literal) {
//       if (entry.termType === "Literal" && entry.language) {
//         result[entry.language] = entry.value;
//       }
//     }
//   }
//   return result;
// }

// async function importRdfsModel(parentIri: string, url: string, newIri: string, userMetadata: any): Promise<SemanticModelEntity[]> {
//   await resourceModel.createResource(parentIri, newIri, "https://dataspecer.com/core/model-descriptor/pim-store-wrapper", userMetadata);
//   const store = await resourceModel.getOrCreateResourceModelStore(newIri);
//   const wrapper = await createRdfsModel([url], httpFetch);
//   const serialization = await wrapper.serializeModel();
//   serialization.id = newIri;
//   serialization.alias = userMetadata?.label?.en ?? userMetadata?.label?.cs;
//   await store.setJson(serialization);
//   return Object.values(wrapper.getEntities()) as SemanticModelEntity[];
// }

// /**
//  * Splits IRI into prefix and local name.
//  * If invalid, only local name is returned.
//  */
// function splitIri(iri: string | null | undefined): [string, string] {
//   if (!iri) {
//     return ["", ""];
//   }
//   const separator = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
//   if (separator === -1) {
//     return ["", iri];
//   }
//   return [iri.substring(0, separator + 1), iri.substring(separator + 1)];
// }

// async function importRdfsAndDsv(parentIri: string, rdfsUrl: string | null, dsvUrl: string | null, userMetadata: any, allImportedEntities: SemanticModelEntity[]) {
//   async function createModelFromEntities(entities: SemanticModelEntity[], id: string, userMetadata: any) {
//     await resourceModel.createResource(parentIri, id, LOCAL_SEMANTIC_MODEL, userMetadata);
//     const store = await resourceModel.getOrCreateResourceModelStore(id);

//     // Manage prefixes
//     const prefixesCount: Record<string, number> = {};
//     for (const entity of entities) {
//       const [prefix] = splitIri(entity.iri);
//       if (prefix) {
//         prefixesCount[prefix] = (prefixesCount[prefix] ?? 0) + 1;
//       }

//       if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipUsage(entity)) {
//         for (const end of entity.ends) {
//           const [prefix] = splitIri(end.iri);
//           if (prefix) {
//             prefixesCount[prefix] = (prefixesCount[prefix] ?? 0) + 1;
//           }
//         }
//       }
//     }
//     let bestPrefix = null;
//     let bestPrefixCount = 0;
//     for (const [prefix, count] of Object.entries(prefixesCount)) {
//       if (count > bestPrefixCount) {
//         bestPrefix = prefix;
//         bestPrefixCount = count;
//       }
//     }
//     if (bestPrefix) {
//       for (const entity of entities as SemanticModelEntity[]) {
//         if (entity.iri && entity.iri.startsWith(bestPrefix)) {
//           entity.iri = entity.iri.substring(bestPrefix.length);
//         }
//         if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipUsage(entity)) {
//           for (const end of entity.ends) {
//             if (end.iri && end.iri.startsWith(bestPrefix)) {
//               end.iri = end.iri.substring(bestPrefix.length);
//             }
//           }
//         }
//       }
//     }

//     const result = {
//       modelId: id,
//       modelAlias: userMetadata?.label?.en ?? userMetadata?.label?.cs,
//       entities: Object.fromEntries(entities.map((e) => [e.id, e])),
//       baseIri: bestPrefix,
//     } as any;

//     await store.setJson(result);
//   }

//   /**
//    * We import entities identified by their IRIs and store them with their IDs.
//    */
//   const knownMapping: Record<string, string> = {};
//   for (const datatype of DataTypeURIs) {
//     knownMapping[datatype] = datatype;
//   }

//   // Vocabulary

//   let vocabularyEntities: SemanticModelEntity[] = [];
//   if (rdfsUrl) {
//     const wrapper = await createRdfsModel([rdfsUrl], httpFetch);
//     const serialization = wrapper.serializeModel();
//     const model = new PimStoreWrapper(serialization.pimStore, serialization.id, serialization.alias, serialization.urls);
//     model.fetchFromPimStore();

//     for (const entity of Object.values(model.getEntities())) {
//       if (isSemanticModelClass(entity)) {
//         knownMapping[entity.iri!] = entity.id;
//       }
//       if (isSemanticModelRelationship(entity)) {
//         if (entity.iri) {
//           knownMapping[entity.iri!] = entity.id;
//         }
//         for (const end of entity.ends) {
//           if (end.iri) {
//             knownMapping[end.iri!] = entity.id;
//           }
//         }
//       }
//     }

//     vocabularyEntities = Object.values(model.getEntities()) as SemanticModelEntity[];
//   }
//   allImportedEntities.push(...vocabularyEntities.map((e) => ({ ...e }))); // We need to clone because the following function modifies iris
//   if (vocabularyEntities.length > 0) {
//     await createModelFromEntities(vocabularyEntities, parentIri + "/" + "vocabulary", userMetadata);
//   }

//   // DSV

//   let profileEntities: SemanticModelEntity[] = [];
//   if (dsvUrl) {
//     const response = await fetch(dsvUrl);
//     const data = await response.text();
//     const conceptualModel = await rdfToConceptualModel(data);
//     const dsvResult = conceptualModelToEntityListContainer(conceptualModel[0], {
//       iriToIdentifier: (iri) => knownMapping[iri] ?? iri,
//       iriPropertyToIdentifier(iri, rangeConcept) {
//         const isPrimitive = isDataType(rangeConcept);
//         const candidate = allImportedEntities.filter(isSemanticModelRelationship).find((e) => e.ends[1].iri === iri && isSemanticModelRelationPrimitive(e) === isPrimitive);
//         if (candidate) {
//           return candidate.id;
//         }
//         return knownMapping[iri] ?? iri;
//       },
//     });

//     profileEntities = dsvResult.entities as SemanticModelEntity[];
//   }
//   if (profileEntities.length > 0) {
//     await createModelFromEntities(profileEntities, parentIri + "/" + "profile", userMetadata);
//   }
// }

// /**
//  * @deprecated drop support anytime it would require changes
//  */
// async function legacyDsvImport(store: N3.Store, url: string, baseIri: string, parentIri: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
//   const name = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://purl.org/dc/terms/title", null));
//   const description = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://www.w3.org/2000/01/rdf-schema#comment", null));

//   // Create package
//   const newPackageIri = parentIri + "/" + uuidv4();
//   const pkg = await resourceModel.createPackage(parentIri, newPackageIri, {
//     label: name,
//     description,
//     importedFromUrl: url,
//     documentBaseUrl: url,
//   });

//   let rdfsUrl = null;
//   let dsvUrl = null;

//   const artefacts = [
//     ...store.getObjects(baseIri, "https://w3id.org/dsv#artefact", null), // TODO: remove when every known specification contains prof:hasResource
//     ...store.getObjects(baseIri, "http://www.w3.org/ns/dx/prof/hasResource", null),
//   ];

//   for (const artefact of artefacts) {
//     const artefactUrl = store.getObjects(artefact, "http://www.w3.org/ns/dx/prof/hasArtifact", null)[0].id;
//     const role = store.getObjects(artefact, "http://www.w3.org/ns/dx/prof/hasRole", null)[0].id;

//     if (role === "http://www.w3.org/ns/dx/prof/role/vocabulary") {
//       rdfsUrl = artefactUrl;
//     } else if (role === "http://www.w3.org/ns/dx/prof/role/schema") {
//       dsvUrl = artefactUrl;
//     }
//   }

//   const vocabularies = [
//     ...new Set([
//       ...store.getObjects(baseIri, "https://w3id.org/dsv#usedVocabularies", null).map((v) => v.id), // TODO: remove when every known specification contains prof:isProfileOF
//       ...store.getObjects(baseIri, "http://purl.org/dc/terms/references", null).map((v) => v.id), // TODO: remove when every known specification contains prof:isProfileOF
//       ...store.getObjects(baseIri, "http://www.w3.org/ns/dx/prof/isProfileOf", null).map((v) => v.id),
//     ]),
//   ];
//   const entities: SemanticModelEntity[] = [];
//   for (const vocabularyId of vocabularies) {
//     const urlToImport = vocabularyId;
//     const [, e] = await importFromUrl(newPackageIri, urlToImport);
//     entities.push(...e);
//   }

//   await importRdfsAndDsv(
//     newPackageIri,
//     rdfsUrl,
//     dsvUrl,
//     {
//       label: {
//         en: name.en ?? name.cs,
//       },
//       documentBaseUrl: url,
//     },
//     entities,
//   );

//   return [(await resourceModel.getResource(newPackageIri))!, entities];
// }

// async function dsvImport(store: N3.Store, url: string, baseIri: string, parentIri: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
//   // Find the core model
//   const coreSubjects = store.getSubjects("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", PROF.Profile, null);

//   const coreId = coreSubjects[0].id;

//   const name = jsonLdLiteralToLanguageString(store.getObjects(coreId, "http://purl.org/dc/terms/title", null));
//   const description = jsonLdLiteralToLanguageString(store.getObjects(coreId, "http://www.w3.org/2000/01/rdf-schema#comment", null));

//   // Create package
//   const newPackageIri = parentIri + "/" + uuidv4();
//   const pkg = await resourceModel.createPackage(parentIri, newPackageIri, {
//     label: name,
//     description,
//     importedFromUrl: url,
//     documentBaseUrl: url,
//   });

//   const resources = store.getObjects(coreId, PROF.hasResource, null);

//   let rdfsUrl = null;
//   let dsvUrl = null;
//   for (const resource of resources) {
//     if (resource.id.startsWith('"')) {
//       // todo There is this weird bug where one resource contains parenthesis
//       continue;
//     }

//     const role = store.getObjects(resource, PROF.hasRole, null)[0].id;
//     const artefactUrl = store.getObjects(resource.id, PROF.hasArtifact, null)[0].id;

//     if (role === PROF.ROLE.Vocabulary) {
//       rdfsUrl = artefactUrl;
//     } else if (role === PROF.ROLE.Specification) {
//       dsvUrl = artefactUrl;
//     }
//   }

//   const entities: SemanticModelEntity[] = [];
//   for (const profile of store.getObjects(coreId, PROF.isProfileOf, null)) {
//     const urlToImport = store.getObjects(profile, PROF.hasArtifact, null)[0].id;
//     const [, e] = await importFromUrl(newPackageIri, urlToImport);
//     entities.push(...e);
//   }

//   await importRdfsAndDsv(
//     newPackageIri,
//     rdfsUrl,
//     dsvUrl,
//     {
//       label: {
//         en: name.en ?? name.cs,
//       },
//       documentBaseUrl: url,
//     },
//     entities,
//   );

//   return [(await resourceModel.getResource(newPackageIri))!, entities];
// }

// /**
//  * Imports from URL and creates either a package or PIM model.
//  */
// async function importFromUrl(parentIri: string, url: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
//   url = url.replace(/#.*$/, "");

//   // const baseIri = url;
//   const baseIri = url;

//   // Load the URL
//   const queryResponse = await fetch(url);
//   if (!queryResponse.ok) {
//     throw new Error("Failed to fetch the URL: " + queryResponse.statusText);
//   }
//   if (queryResponse.headers.get("content-type")?.includes("text/html")) {
//     const queryText = await queryResponse.text();
//     const html = parse(queryText);
//     const jsonLdText = html.querySelector('script[type="application/ld+json"]')?.innerHTML ?? "{}";

//     console.info("jsonld", jsonld);
//     console.info("jsonld", jsonld.expand);
//     console.info("jsonld", jsonld.toRDF);

//     const jsonLd = await jsonld.expand(JSON.parse(jsonLdText), {
//       base: baseIri,
//     });
//     const nquads = await jsonld.toRDF(jsonLd, { format: "application/n-quads" });
//     const parser = new N3.Parser({ format: "N-Triples", baseIRI: baseIri });
//     const store = new N3.Store();
//     store.addQuads(parser.parse(nquads as string));

//     if (store.getObjects(baseIri, "https://w3id.org/dsv#artefact", null).length > 0) {
//       // This is a legacy DSV model
//       return legacyDsvImport(store, url, baseIri, parentIri);
//     } else {
//       return dsvImport(store, url, baseIri, parentIri);
//     }
//   } else {
//     // Generate name
//     let chunkToParse = url;
//     try {
//       chunkToParse = new URL(url).pathname;
//     } catch (error) {}

//     const chunks = chunkToParse.split("/");
//     const section = chunks.pop() || chunks.pop() || "unnamed"; // handle potential trailing slash
//     const name = section.split(".")[0];

//     return [
//       null,
//       await importRdfsModel(parentIri, url, parentIri + "/" + uuidv4(), {
//         documentBaseUrl: url,
//         ...(name ? { label: { en: name } } : {}),
//       }),
//     ];
//   }
// }

// /**
//  * Import: Import endpoint is a wizard that allows you to import specific package/model from a remote source.
//  */
// export const importResource = asyncHandler(async (request: express.Request, response: express.Response) => {
//   const querySchema = z.object({
//     // Parent package IRI
//     parentIri: z.string().min(1),
//     // Url from which to import the resource
//     url: z.string().url(),
//   });

//   const query = querySchema.parse(request.query);

//   const [result] = await importFromUrl(query.parentIri, query.url);

//   response.send(result);
//   return;
// });


// (async () => {

//   const [result] = await importFromUrl("http://dataspecer.com/packages/local-root", "https://mff-uk.github.io/specifications/dcat-ap/");
//   console.info("importFromURL result", result);

//   if (result === null) {
//     console.error("Could not import");
//     throw new Error("Could not import");
//   }



//   const resource = await resourceModel.getPackage(result.iri);

//   if (!resource) {
//     console.error("The resource is missing");
//     throw new Error("The resource is missing");
//   }

//   const zip = new ZipStreamDictionary();


//   async function generateArtifacts(packageIri: string, streamDictionary: StreamDictionary, queryParams: string = "") {
//     // Call the main function from @dataspecer/specification
//     await generateSpecification(packageIri, {
//       modelRepository: new BackendModelRepository(resourceModel),
//       output: streamDictionary,
//       fetch: httpFetch,
//     }, {
//       queryParams,
//     });
//   }

//   await generateArtifacts(result.iri, zip);

//   const dirname = "test-generate-specification";
//   const filename = `test${result.iri.substring(result.iri.length - 4)}.zip`;
//   if(!fs.existsSync(dirname)) {
//     fs.mkdirSync(dirname);
//   }
//   // const stream = zip.writePath(`${dirname}/${filename}`);
//   const zipData = await zip.save();
//   fs.writeFileSync(`${dirname}/${filename}`, zipData);
//   // await stream.write(`Tento zip byl vygenerován ${new Date().toLocaleString("cs-CZ")}.`);
//   // await stream.close();

//   extractZipBufferToDisk(zipData, dirname);

//   console.info("TODO RadStr: Finished generating specification from command line");
//   console.info(zip);
// })();



// // TODO RadStr: ChatGPT
// import JSZip from 'jszip';
// import * as path from 'path';

// async function extractZipBufferToDisk(zipBuffer: Buffer, outputDir: string) {
//   const zip = await JSZip.loadAsync(zipBuffer);

//   for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
//     const outputPath = path.join(outputDir, relativePath);

//     if (zipEntry.dir) {
//       fs.mkdirSync(outputPath, { recursive: true });
//     } else {
//       const content = await zipEntry.async('nodebuffer');
//       fs.mkdirSync(path.dirname(outputPath), { recursive: true });
//       fs.writeFileSync(outputPath, content);
//     }
//   }

//   console.log("Extraction from buffer complete.");
//   console.log("Exiting process with success");
//   process.exit(0);
// }



///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

import { v4 as uuidv4 } from "uuid";

import fs from "fs";
import { resourceModel } from "./main.ts";

import { Readable } from "stream";
import { pipeline } from "stream/promises";

import JSZip from 'jszip';
import * as path from 'path';
import { ReadableStream } from "stream/web";
import { PackageImporter } from "./export-import/import.ts";
import { generateArtifacts } from "./routes/generate.ts";
import { ZipStreamDictionary } from "./utils/zip-stream-dictionary.ts";
import { importFromGitUrl } from "./routes/import.ts";


/**
 * @deprecated TODO RadStr: move somewhere else or remove - just for debugging
 */
function debugPrintDirectoryContent(path: string) {
  const stats = fs.statSync(path);
  if (stats.isDirectory()) {
    const directory = fs.readdirSync(path);
    directory.forEach(entry => console.info(entry));
  }
  else {
    console.error("Not a directory");
  }
}

async function generateArtifactsFromImported(imported: string[]) {
  if (imported.length === 0) {
    console.error("Could not import");
    throw new Error("Could not import");
  }

  const importedIRI = imported[0];

  const resource = await resourceModel.getPackage(importedIRI);

  if (!resource) {
    console.error("The resource is missing");
    throw new Error("The resource is missing");
  }

  const zip = new ZipStreamDictionary();
  await generateArtifacts(importedIRI, zip);

  const dirname = "test-generate-specification";
  // TODO RadStr: I am not sure why am I actually using the .length - 4
  const filename = `test${importedIRI.substring(importedIRI.length - 4)}.zip`;
  if(!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
  const zipData = await zip.save();
  fs.writeFileSync(`${dirname}/${filename}`, zipData);

  await extractZipBufferToDisk(zipData, dirname);

  console.info("TODO RadStr: Finished generating specification from command line");
  console.log("Extraction from buffer complete.");
  console.log("Exiting process with success");
}


// TODO RadStr: Something kinda like .gitignore
const namesToIgnoreInHomeDirectory: string[] = [
  "README.md",
  ".git",
  ".github",
  "dataspecer-source-code",
  "generated-content",
];

/**
 * Fills the {@link zip} with the data starting from {@link fullPath} recursively. But the actual root directory for the writing to the zip is {@link writeToRelativePath}.
 */
function createImportZipFromFilesystem(fullPath: string, writeToRelativePath: string, isHomePath: boolean, zip: ZipStreamDictionary) {
  if (fs.statSync(fullPath).isDirectory()) {
    const dir = fs.readdirSync(fullPath);
    for (const entry of dir) {
      const newFullpath = path.join(fullPath, entry);
      const newWriteToRelativePath = path.join(writeToRelativePath, entry);

      if (isHomePath) {
        if (namesToIgnoreInHomeDirectory.includes(entry)) {
          continue;
        }
      }
      createImportZipFromFilesystem(newFullpath, newWriteToRelativePath, false, zip);
    }
  }
  else {
    const file = fs.readFileSync(fullPath);
    const stream = zip.writePath(writeToRelativePath);
    stream.write(file.toString());
    stream.close();
  }
}

async function generateSpecificationFromFileSystem() {
  // TODO RadStr: Commented DEBUG - can safely remove later
  // let path: string;
  // path = ".";
  // for (let i = 0; i < 10; i++) {
  //   console.info("--------------------------------------------------------------");
  //   debugPrintDirectoryContent(path);
  //   path = "../".concat(path);
  // }

  const packageIri = uuidv4();
  const zipDictionaryForFilesystemData = new ZipStreamDictionary();
  const homeDirectory = "../../..";
  createImportZipFromFilesystem(homeDirectory, packageIri, true, zipDictionaryForFilesystemData);
  const zipDataFromFilesystem = await zipDictionaryForFilesystemData.save();

  // TODO RadStr: DEBUG - Just save the zip + the zip content
  // await extractZipBufferToDisk(zipDataFromFilesystem, "test-debug-zip-file");
  // fs.writeFileSync(`test-debug-zip-file/zip-soubor.zip`, zipDataFromFilesystem);

  const importer = new PackageImporter(resourceModel);
  const imported = await importer.doImport(zipDataFromFilesystem);

  await generateArtifactsFromImported(imported);
  process.exit(0);
}

/**
 * Generates specification from git URL passed in as argument from command line
 * @param gitZipDownloadURL is the URL of git provider, which returns the zip on access - for example https://github.com/RadStr-bot/4f21bf6d-2116-4ab3-b387-1f8074f7f412/archive/refs/heads/main.zip
 */
async function generateSpecificationFromGitURL() {
  console.info("process.argv", process.argv);
  // Example of download URL - https://github.com/RadStr-bot/4f21bf6d-2116-4ab3-b387-1f8074f7f412/archive/refs/heads/main.zip (or commit SHA instead of refs/heads/main)
  const gitZipDownloadURL = process.argv[2];
  const imported = await importFromGitUrl(gitZipDownloadURL);
  await generateArtifactsFromImported(imported);
  process.exit(0);
}


// await generateSpecificationFromGitURL();   // Alternative
await generateSpecificationFromFileSystem();



/**
 * TODO RadStr: Generated by ChatGPT
 */
async function extractZipBufferToDisk(zipBuffer: Buffer, outputDir: string) {
  const zip = await JSZip.loadAsync(zipBuffer);

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    const outputPath = path.join(outputDir, relativePath);
    console.info("outputPath", outputPath);

    if (zipEntry.dir) {
      fs.mkdirSync(outputPath, { recursive: true });
    } else {
      const content = await zipEntry.async('nodebuffer');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content);
    }
  }
}
