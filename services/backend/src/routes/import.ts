import { LOCAL_SEMANTIC_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import {
  isSemanticModelClass,
  isSemanticModelRelationPrimitive,
  isSemanticModelRelationship,
  LanguageString,
  SemanticModelEntity,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { DataTypeURIs, isDataType } from "@dataspecer/core-v2/semantic-model/datatypes";
import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { PimStoreWrapper, serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { turtleStringToGeneratorConfiguration } from "@dataspecer/data-specification-vocabulary/generator-configuration";
import { conceptualModelToEntityListContainer, rdfToConceptualModel } from "@dataspecer/data-specification-vocabulary/semantic-model";
import { dsvMetadataWellKnown, rdfToDSVMetadata } from "@dataspecer/data-specification-vocabulary/specification-description";
import { turtleStringToStructureModel } from "@dataspecer/data-specification-vocabulary/structure-model";
import { canonicalizeIds } from "@dataspecer/structure-model";
import express from "express";
import * as jsonld from "jsonld";
import N3, { Quad_Object } from "n3";
import { parse } from "node-html-parser";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { modelRepository } from "../main.ts";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { diffModelEntitiesToOperations, diffModelStates } from "../models/model-operations.ts";
import { type ModelRepositoryType } from "../models/model-repository.ts";
import { BaseResource } from "../models/resource-model.ts";
import { StagingModelRepository } from "../models/staging-model-repository.ts";
import { getModelsForPackage } from "../utils/backend-model-store.ts";
import { asyncHandler } from "./../utils/async-handler.ts";


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

/**
 * Fetches a URL (following redirects, as fetch does by default) and rejects
 * if the final response is not a 2xx, instead of letting callers parse an
 * error page or empty body as if it were the requested content.
 */
async function fetchOrThrow(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }
  return response;
}

/**
 * Creates a resource if it doesn't exist, or updates its metadata if it already exists.
 */
async function ensureResource(repository: ModelRepositoryType, parentIri: string, iri: string, type: string, userMetadata: any): Promise<void> {
  const existing = await repository.getResource(iri);
  if (existing) {
    await repository.updateResource(iri, userMetadata);
  } else {
    await repository.createResource(parentIri, iri, type, userMetadata);
  }
}

/**
 * Creates a package if it doesn't exist, or updates its metadata if it already exists.
 */
async function ensurePackage(repository: ModelRepositoryType, parentIri: string, iri: string, userMetadata: any): Promise<void> {
  const existing = await repository.getResource(iri);
  if (existing) {
    await repository.updateResource(iri, userMetadata);
  } else {
    await repository.createPackage(parentIri, iri, userMetadata);
  }
}

/**
 * Deletes children of a package that are not in the touchedIris set.
 */
async function deleteUntouchedChildren(repository: ModelRepositoryType, packageIri: string, touchedIris: Set<string>): Promise<void> {
  const pkg = await repository.getPackage(packageIri);
  if (pkg?.subResources) {
    for (const child of pkg.subResources) {
      if (!touchedIris.has(child.iri)) {
        await repository.deleteResource(child.iri);
      }
    }
  }
}

/**
 * Builds a map from importedFromUrl/documentBaseUrl to child IRI for matching during reload.
 */
async function getExistingChildrenByUrl(repository: ModelRepositoryType, packageIri: string): Promise<Map<string, string>> {
  const pkg = await repository.getPackage(packageIri);
  const map = new Map<string, string>();
  if (pkg?.subResources) {
    for (const child of pkg.subResources) {
      const url = (child.userMetadata as any)?.importedFromUrl ?? (child.userMetadata as any)?.documentBaseUrl;
      if (url) {
        map.set(url, child.iri);
      }
    }
  }
  return map;
}

/**
 * Determines the leading IRI prefix shared by most of a set of entities.
 */
function getDominantBaseIri(entities: SemanticModelEntity[]): string | null {
  const prefixCounts: Record<string, number> = {};
  const count = (iri: string | null | undefined) => {
    const [prefix] = splitIri(iri);
    if (prefix) {
      prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
    }
  };
  for (const entity of entities) {
    count(entity.iri);
    if (isSemanticModelRelationship(entity)) {
      for (const end of entity.ends) {
        count(end.iri);
      }
    }
  }

  let bestPrefix: string | null = null;
  let bestCount = 0;
  for (const [prefix, prefixCount] of Object.entries(prefixCounts)) {
    if (prefixCount > bestCount) {
      bestPrefix = prefix;
      bestCount = prefixCount;
    }
  }
  return bestPrefix;
}

/**
 * Finds an existing RDFS_MODEL child of the package whose stored entities
 * have the given dominant base IRI, ignoring any child whose iri is in
 * excludeIris (already claimed by a URL match or an earlier content match
 * during the same reload). Used to recognize a profiled vocabulary across a
 * reload when its source URL changed (e.g. dcat2.ttl -> dcat3.ttl), so it can
 * be diffed against its previous state instead of being treated as a brand
 * new model.
 */
async function findRdfsModelChildByBaseIri(repository: ModelRepositoryType, packageIri: string, baseIri: string, excludeIris: Set<string>): Promise<string | undefined> {
  const pkg = await repository.getPackage(packageIri);
  for (const child of pkg?.subResources ?? []) {
    if (!child.types.includes(RDFS_MODEL) || excludeIris.has(child.iri)) {
      continue;
    }
    const entities = Object.values((await repository.getModelEntities(child.iri)) ?? {}) as SemanticModelEntity[];
    if (getDominantBaseIri(entities) === baseIri) {
      return child.iri;
    }
  }
  return undefined;
}

/**
 * Derives a display name from a URL's last path segment, without its file
 * extension (e.g. "https://example.com/dcat3.ttl" -> "dcat3").
 */
function deriveNameFromUrl(url: string): string {
  let chunkToParse = url;
  try {
    chunkToParse = new URL(url).pathname;
  } catch (error) {}

  const chunks = chunkToParse.split("/");
  const section = chunks.pop() || chunks.pop() || "unnamed"; // handle potential trailing slash
  return section.split(".")[0];
}

/**
 * Fetches and parses a raw RDFS/vocabulary document without persisting
 * anything, so the caller can inspect its entities before deciding under
 * which resource iri to store it.
 */
async function fetchRdfsModel(url: string) {
  return await createRdfsModel([url], httpFetch);
}

/**
 * Persists an already-fetched RDFS wrapper under the given resource iri,
 * creating the resource if it doesn't exist yet or updating it otherwise.
 */
async function persistRdfsModel(repository: ModelRepositoryType, parentIri: string, wrapper: Awaited<ReturnType<typeof fetchRdfsModel>>, newIri: string, userMetadata: any): Promise<SemanticModelEntity[]> {
  const serialization = wrapper.serializeModel();
  serialization.id = newIri;
  serialization.alias = userMetadata?.label?.en ?? userMetadata?.label?.cs;
  await ensureResource(repository, parentIri, newIri, RDFS_MODEL, userMetadata);
  await repository.setModelJson(newIri, serialization);
  return Object.values(wrapper.getEntities()) as SemanticModelEntity[];
}

/**
 * Creates a PIM Wrapper that imports an RDFS model. Model has IRI that needs to
 * be specified, but the IDs inside the model are stable. If the model exists,
 * it is updated.
 *
 * @todo This function should be merged with importRdfsAndDsv and PIM store
 * wrapper should be deprecated.
 */
async function importRdfsModel(repository: ModelRepositoryType, parentIri: string, url: string, newIri: string, userMetadata: any): Promise<SemanticModelEntity[]> {
  const wrapper = await fetchRdfsModel(url);
  return await persistRdfsModel(repository, parentIri, wrapper, newIri, userMetadata);
}

/**
 * Performs deterministic import of multiple structure models.
 *
 * The model ID must match the DataPsmSchema IRI.
 *
 * @param urls
 * @param iriPrefix Prefix that will be assigned to all models, must end with slash or be empty.
 * @param rootPackageId
 * @param touchedModelIds Adds model IDs that were created or updated. This
 * could be used to track which models were not updated to delete them after the
 * import.
 */
async function importAllStructureModels(repository: ModelRepositoryType, urls: string[], iriPrefix: string, rootPackageId: string, touchedModelIds?: Set<string>) {
  // Load all models so we can derive deterministic IDs

  const rawModels: CoreResource[][] = [];
  const iriMapping: Record<string, string> = {};

  for (const url of urls) {
    const response = await fetchOrThrow(url);
    const rdfData = await response.text();
    const structureModelEntities = await turtleStringToStructureModel(rdfData);

    rawModels.push(structureModelEntities);

    const schema = structureModelEntities.find(DataPsmSchema.is)!; // Schema must exist
    const originalIri = schema.iri as string;

    // Get the last chunk
    const chunk = originalIri.match(/([^\/#]*)[#\/]?$/)?.[1] ?? originalIri.replace(/[\/]/g, "_");
    const newIri = iriPrefix + chunk;

    if (!iriMapping[originalIri]) {
      iriMapping[originalIri] = newIri;
    }
  }

  // Now we can process all models with their new IRIs and save them

  const models = canonicalizeIds(rawModels, iriMapping);
  for (const model of models) {
    await ensureResource(repository, rootPackageId, model.iri, V1.PSM, {});
    touchedModelIds?.add(model.iri);

    const modelData = {
      operations: [],
      resources: Object.fromEntries(model.model.map((e) => [e.iri, e])),
    };

    await repository.setModelJson(model.iri, modelData);
  }
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

/**
 * This methods imports or re-imports vocabulary from RDFS or DSV.
 *
 * @todo We probably want to split this into two separate functions.
 * @param touchedModelIds Adds model IDs that were created or updated. This
 * could be used to track which models were not updated to delete them after the
 * import.
 */
async function importRdfsAndDsv(repository: ModelRepositoryType, parentIri: string, rdfsUrl: string | null, dsvUrl: string | null, userMetadata: any, allImportedEntities: SemanticModelEntity[], touchedModelIds?: Set<string>) {
  async function createModelFromEntities(entities: SemanticModelEntity[], id: string, userMetadata: any) {
    await ensureResource(repository, parentIri, id, LOCAL_SEMANTIC_MODEL, userMetadata);
    touchedModelIds?.add(id);

    // Manage prefixes
    const prefixesCount: Record<string, number> = {};
    for (const entity of entities) {
      const [prefix] = splitIri(entity.iri);
      if (prefix) {
        prefixesCount[prefix] = (prefixesCount[prefix] ?? 0) + 1;
      }

      if (isSemanticModelRelationship(entity)) {
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
        if (isSemanticModelRelationship(entity)) {
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

    await repository.setModelJson(id, result);
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
    const response = await fetchOrThrow(dsvUrl);
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
async function legacyDsvImport(repository: ModelRepositoryType, store: N3.Store, url: string, baseIri: string, parentIri: string): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  const name = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://purl.org/dc/terms/title", null));
  const description = jsonLdLiteralToLanguageString(store.getObjects(baseIri, "http://www.w3.org/2000/01/rdf-schema#comment", null));

  // Create package
  const newPackageIri = parentIri + "/" + uuidv4();
  await repository.createPackage(parentIri, newPackageIri, {
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
    const [, e] = await importFromUrl(newPackageIri, urlToImport, undefined, undefined, repository);
    entities.push(...e);
  }

  await importRdfsAndDsv(
    repository,
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

  return [(await repository.getResource(newPackageIri))!, entities];
}

/**
 * Performs import from DSV metadata document.
 */
async function dsvImport(repository: ModelRepositoryType, store: N3.Store, url: string, baseIri: string, parentIri: string, existingPackageIri?: string, touchedModelIds?: Set<string>): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  const dsv = rdfToDSVMetadata(store.getQuads(null, null, null, null), { baseIri });

  // todo: what to do when there are multiple specifications that this document describes?
  const mainSpecification = dsv[0];

  // Create or reuse package

  const rootPackageId = existingPackageIri ?? parentIri + "/" + uuidv4();
  touchedModelIds?.add(rootPackageId);

  await ensurePackage(repository, parentIri, rootPackageId, {
    label: mainSpecification.title,
    description: mainSpecification.description,
    importedFromUrl: url,
    documentBaseUrl: url,
  });

  // We create a generator configuration so that re-generation works correctly
  {
    const gcResource = mainSpecification.resources.find((r) => r.role === dsvMetadataWellKnown.role.schema && r.conformsTo.includes(dsvMetadataWellKnown.conformsTo.dsvStructureConfiguration));

    let configurationModel = {};
    if (gcResource) {
      const queryResponse = await fetchOrThrow(gcResource.url);
      const data = await queryResponse.text();
      configurationModel = await turtleStringToGeneratorConfiguration(null, data); // todo: iri of resource descriptor is not iri of the configuration IMO
    }

    let rootHref = new URL(".", url).href;

    // todo, older specifications had urls ending with /cs/ or /en/ but the root was without it
    if (rootHref.endsWith("/cs/") || rootHref.endsWith("/en/")) {
      rootHref = rootHref.substring(0, rootHref.length - 3);
    }

    await ensureResource(repository, rootPackageId, rootPackageId + "/generator-configuration", V1.GENERATOR_CONFIGURATION, {});
    touchedModelIds?.add(rootPackageId + "/generator-configuration");
    const configuration = DataSpecificationConfigurator.setToObject(configurationModel, {
      ...DataSpecificationConfigurator.getFromObject(configurationModel),
      publicBaseUrl: rootHref,
    });
    await repository.setModelJson(rootPackageId + "/generator-configuration", configuration);
  }

  // Identify important resources to import

  const structureModelResources: string[] = [];
  let rdfsUrl = null;
  let dsvUrl = null;
  for (const resource of mainSpecification.resources) {
    if (resource.role === dsvMetadataWellKnown.role.vocabulary) {
      rdfsUrl = resource.url;
    } else if (
      resource.role === dsvMetadataWellKnown.role.constraints && // This also matches SHACL shapes
      resource.conformsTo.includes(dsvMetadataWellKnown.conformsTo.dsvApplicationProfile) &&
      resource.conformsTo.includes(dsvMetadataWellKnown.conformsTo.profProfile)
    ) {
      dsvUrl = resource.url;
    }

    if (resource.role === dsvMetadataWellKnown.role.schema && resource.conformsTo.includes(dsvMetadataWellKnown.conformsTo.dsvStructure)) {
      structureModelResources.push(resource.url);
    }
  }

  // Import all profiled semantic data specifications

  const isReload = !!existingPackageIri;
  const existingChildrenByUrl = isReload ? await getExistingChildrenByUrl(repository, rootPackageId) : undefined;
  // Existing children actually claimed so far during this reload (by an
  // exact URL match, or by a content match below), so the same one is never
  // reused for two different profiles. Note this is NOT existingChildrenByUrl's
  // values(): that map lists every existing child with a recorded URL,
  // including ones whose URL is no longer referenced by any current profile
  // (e.g. the old dcat2.ttl child once its profile url becomes dcat3.ttl) -
  // those are exactly the candidates the content match below must still be
  // able to see.
  const claimedExistingIris = new Set<string>();

  const allEntitiesFromProfiled: SemanticModelEntity[] = [];
  for (const profile of mainSpecification.isProfileOf) {
    const childExistingIri = existingChildrenByUrl?.get(profile.url);

    if (childExistingIri || !isReload) {
      if (childExistingIri) {
        claimedExistingIris.add(childExistingIri);
      }
      const [, e] = await importFromUrl(rootPackageId, profile.url, childExistingIri, touchedModelIds, repository);
      allEntitiesFromProfiled.push(...e);
      continue;
    }

    // No URL match during a reload: the profiled vocabulary's URL may simply
    // have changed (e.g. dcat2.ttl -> dcat3.ttl). We only attempt to
    // recognize this for raw vocabulary documents, by downloading it first
    // and matching its dominant IRI prefix against an existing child before
    // deciding whether to store it as a new model or update the matched one -
    // without this, the old and new state would be treated as unrelated
    // models and the reload would be unable to derive a diff for it (see
    // below in reloadResource, where previous/next models without a
    // counterpart on the other side are dropped from the diff). There is no
    // reliable way to recognize this for full HTML specifications profiled
    // via isProfileOf before fully importing them, so those are just
    // imported as new, same as before.
    const probeUrl = profile.url.replace(/#.*$/, "");
    const probeResponse = await fetchOrThrow(probeUrl);
    const isHtml = probeResponse.headers.get("content-type")?.includes("text/html") ?? false;

    if (isHtml) {
      const [, e] = await importFromUrl(rootPackageId, profile.url, undefined, touchedModelIds, repository);
      allEntitiesFromProfiled.push(...e);
      continue;
    }

    const wrapper = await fetchRdfsModel(profile.url);
    const baseIri = getDominantBaseIri(Object.values(wrapper.getEntities()) as SemanticModelEntity[]);
    const existingMatchIri = baseIri ? await findRdfsModelChildByBaseIri(repository, rootPackageId, baseIri, claimedExistingIris) : undefined;
    if (existingMatchIri) {
      claimedExistingIris.add(existingMatchIri);
    }

    const targetIri = existingMatchIri ?? rootPackageId + "/" + uuidv4();
    touchedModelIds?.add(targetIri);
    const name = deriveNameFromUrl(profile.url);
    const e = await persistRdfsModel(repository, rootPackageId, wrapper, targetIri, {
      documentBaseUrl: profile.url,
      ...(name ? { label: { en: name } } : {}),
    });
    allEntitiesFromProfiled.push(...e);
  }

  // Import RDFS and DSV

  await importRdfsAndDsv(
    repository,
    rootPackageId,
    rdfsUrl,
    dsvUrl,
    {
      label: mainSpecification.title,
      documentBaseUrl: url,
    },
    allEntitiesFromProfiled,
    touchedModelIds,
  );

  await importAllStructureModels(repository, structureModelResources, rootPackageId + "/", rootPackageId, touchedModelIds);

  // Delete children that were not touched during reload
  if (touchedModelIds) {
    await deleteUntouchedChildren(repository, rootPackageId, touchedModelIds);
  }

  return [(await repository.getResource(rootPackageId))!, allEntitiesFromProfiled];
}

/**
 * Universal function that detects the type of the resource and imports it.
 *
 * @param repository The repository the import writes to. The reload flow
 * passes a {@link StagingModelRepository} so the import is only staged in
 * memory instead of modifying the stored resources.
 * @todo move to packages so it is not backend dependent, make more generic such as custom fetch function
 */
export async function importFromUrl(
  parentIri: string,
  url: string,
  existingIri?: string,
  touchedModelIds?: Set<string>,
  repository: ModelRepositoryType = modelRepository,
): Promise<[BaseResource | null, SemanticModelEntity[]]> {
  url = url.replace(/#.*$/, "");

  // const baseIri = url;
  const baseIri = url;

  // Load the URL
  const queryResponse = await fetchOrThrow(url);
  if (queryResponse.headers.get("content-type")?.includes("text/html")) {
    const queryText = await queryResponse.text();
    const html = parse(queryText);
    const jsonLdText = html.querySelector('script[type="application/ld+json"]')?.innerHTML ?? "{}";
    const jsonLd = await jsonld.expand(JSON.parse(jsonLdText), {
      base: baseIri,
    });
    const quads = (await jsonld.toRDF(jsonLd)) as N3.Quad[];
    const store = new N3.Store(quads);

    if (store.getObjects(baseIri, "https://w3id.org/dsv#artefact", null).length > 0) {
      // This is a legacy DSV model
      return legacyDsvImport(repository, store, url, baseIri, parentIri);
    } else {
      return dsvImport(repository, store, url, baseIri, parentIri, existingIri, touchedModelIds);
    }
  } else {
    const name = deriveNameFromUrl(url);

    const newIri = existingIri ?? parentIri + "/" + uuidv4();
    touchedModelIds?.add(newIri);
    return [
      null,
      await importRdfsModel(repository, parentIri, url, newIri, {
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
 * Reload: Reload endpoint updates an existing imported package by re-fetching
 * its content from the source URL. The package IRI is preserved.
 *
 * By default the diff is recorded as a pending evolution branch for review;
 * pass `apply=true` to apply it directly to the main branch instead.
 */
export const reloadResource = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    // IRI of the existing package to reload
    iri: z.string().min(1),
    // Optional URL to reload from (defaults to the stored importedFromUrl)
    url: z.string().url().optional(),
    // When set, the reload is applied directly to the main branch instead of
    // being recorded as a pending evolution branch.
    apply: z
      .string()
      .optional()
      .transform((value) => value !== undefined)
      .pipe(z.boolean()),
  });

  const query = querySchema.parse(request.query);

  // Get the existing package
  const existingResource = await modelRepository.getResource(query.iri);
  if (!existingResource) {
    response.status(404).send({ error: "Resource not found" });
    return;
  }

  // Check if it is a PIM wrapper and if so, we can reload it directly
  if (existingResource.types.includes(RDFS_MODEL)) {
    const previousEntities = (await modelRepository.getModelEntities(existingResource.iri))!;

    const data = await modelRepository.getResourceStoreJson(existingResource.iri) as {urls: string[]};
    const bodyUrls = (request.body as { urls?: string[] })?.urls;
    if (bodyUrls) {
      await modelRepository.setResourceStoreJson(existingResource.iri, { ...data, urls: bodyUrls });
    }
    const urls = bodyUrls ?? data.urls;
    const newModel = await createRdfsModel(urls, httpFetch);
    newModel.id = existingResource.iri;
    // Intentionally skip store.setJson() — the blob stays unchanged.
    // The diff is recorded as pending operations on an independent evolution branch.
    const nextEntities = serializationToPimModelEntities(newModel.serializeModel() as object).entities;

    const previousStates = { [existingResource.iri]: previousEntities };
    const operations = diffModelEntitiesToOperations(existingResource.iri, RDFS_MODEL, previousEntities, nextEntities);
    const projectIri = (await modelRepository.getProjectIri(existingResource.iri))!;
    let evolutionBranchId: number | null = null;
    if (query.apply) {
      await modelRepository.applyTransactions(projectIri, [{ id: uuidv4(), operations }]);
    } else {
      evolutionBranchId = await modelRepository.recordEvolutionTransactions(projectIri, existingResource.iri, [{ id: uuidv4(), operations }], previousStates);
    }

    response.send({ ...(await modelRepository.getResource(existingResource.iri)), evolutionBranchId });
    return;
  }

  // Determine the URL to reload from
  const url = query.url ?? (existingResource.userMetadata as any)?.importedFromUrl;
  if (!url) {
    response.status(400).send({ error: "No URL provided and no importedFromUrl found on the resource" });
    return;
  }

  // Perform reload by re-importing into an in-memory staging overlay: the
  // stored package stays untouched and only the derived operations are
  // recorded on the evolution branch, same as for the RDFS model above. The
  // import reuses existing resource IRIs, so the diff pairs the old and new
  // state of each model.
  const previousModels = await getModelsForPackage(query.iri, modelRepository);

  const staging = new StagingModelRepository(modelRepository);
  await importFromUrl("", url, query.iri, undefined, staging);

  const nextModels = await getModelsForPackage(query.iri, staging);

  // TODO: Creation and deletion of models is not supported in branches yet.
  // Models existing on only one side of the reload are skipped here, and no
  // touched-model tracking is passed to the import above, so vanished models
  // are not deleted either. Only reloads of stable specifications (keeping
  // the same set of models) are therefore fully recorded.
  for (const modelId of Object.keys(previousModels)) {
    if (modelId !== PROJECT_MODEL_ID && !(modelId in nextModels)) {
      delete previousModels[modelId];
    }
  }
  for (const modelId of Object.keys(nextModels)) {
    if (modelId !== PROJECT_MODEL_ID && !(modelId in previousModels)) {
      delete nextModels[modelId];
    }
  }

  const operations = diffModelStates(previousModels, nextModels);
  const projectIri = (await modelRepository.getProjectIri(query.iri))!;
  let evolutionBranchId: number | null = null;
  if (query.apply) {
    await modelRepository.applyTransactions(projectIri, [{ id: uuidv4(), operations }]);
  } else {
    evolutionBranchId = await modelRepository.recordEvolutionTransactions(projectIri, query.iri, [{ id: uuidv4(), operations }], previousModels);
  }

  response.send({ ...(await modelRepository.getResource(query.iri)), evolutionBranchId });
  return;
});
