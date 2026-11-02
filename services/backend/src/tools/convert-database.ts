import { mkdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOCUMENTATION_CONFIGURATION_KEY } from "@dataspecer/documentation/configuration";
import { createTemplateConfigurationConverter } from "./convert-template-configuration.ts";
import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { changesToSemanticModelOperations } from "@dataspecer/core-v2/semantic-model/operations";
import { SemanticProfileModelOperations, isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/profile-model";
import { v4 as uuidv4 } from "uuid";
import { DataPsmClassReference, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, createUpdateEntityOperation, generateOperationId, type OperationInModel } from "@dataspecer/core/operation";
import { createCreateModelOperation, createCreateProjectOperation } from "@dataspecer/core/project-model";
import type { CoreResource } from "@dataspecer/core/core";
import { PimAssociation, PimAssociationEnd, PimAttribute, PimClass, PimSchema } from "./pim.ts";
import configuration from "../configuration.ts";
import { createDatabase } from "../database/database.ts";
import type { ResourceRow } from "../database/schema.ts";
import { migrateDatabase } from "../migration-utils/migrate-database.ts";
import { LocalStoreModel } from "../models/local-store-model.ts";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { ModelRepository } from "../models/model-repository.ts";
import { diffModelEntitiesToOperations } from "../models/model-operations.ts";
import { deserializeModelEntities } from "../models/model-types.ts";
import { ResourceModel, type BaseResource } from "../models/resource-model.ts";
import { TransactionModel } from "../models/transaction-model.ts";
import type { CachedSubgraph, ExtendedSemanticModelClass, MainSemanticModelEntity, SemanticModelGeneralization, ExtendedSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

/** Creates a deterministic identifier for an inheritance edge. */
function getGeneralizationIri(fromIri: string, toIri: string): string {
  return "https://dataspecer.com/semantic-models/generalization" + new URLSearchParams({ fromIri, toIri }).toString();
}

/** Maps PIM identifiers to vocabulary identifiers. */
function getPimIds(resources: Record<string, CoreResource>): Map<string, string> {
  const ids = new Map<string, string>();
  for (const [key, resource] of Object.entries(resources)) {
    if (PimClass.is(resource) || PimAttribute.is(resource) || PimAssociation.is(resource)) {
      const id = resource.pimInterpretation ?? resource.iri;
      if (id === null) {
        throw new Error(`PIM resource "${key}" has no identifier.`);
      }
      ids.set(key, id);
      if (resource.iri !== null) ids.set(resource.iri, id);
    }
  }
  return ids;
}

/** Maps legacy PIM resources to semantic entities keyed by interpretation IRI. */
function convertPim(resources: Record<string, CoreResource>): EntityRecord {
  const ids = getPimIds(resources);
  const entities: EntityRecord<ExtendedSemanticModelClass | SemanticModelGeneralization | ExtendedSemanticModelRelationship> = Object.create(null);
  for (const [key, resource] of Object.entries(resources)) {
    const id = ids.get(key)!;
    if (PimClass.is(resource)) {
      entities[id] = {
        id, type: ["class"], iri: resource.pimInterpretation ?? null,
        name: resource.pimHumanLabel ?? {},
        description: resource.pimHumanDescription ?? {},
        technicalLabel: resource.pimTechnicalLabel ?? null,
        isCodelist: resource.pimIsCodelist ?? false,
        codelistUrl: resource.pimCodelistUrl ?? [],
        regex: resource.pimRegex ?? null,
        example: resource.pimExample ?? null,
        objectExample: resource.pimObjectExample ?? null,
      } satisfies ExtendedSemanticModelClass;
      for (const parentIri of resource.pimExtends ?? []) {
        const parent = ids.get(parentIri) ?? parentIri;
        const generalizationId = getGeneralizationIri(id, parent);
        entities[generalizationId] = {
          id: generalizationId, type: ["generalization"], iri: null, child: id, parent,
        } satisfies SemanticModelGeneralization;
      }
    } else if (PimAttribute.is(resource)) {
      entities[id] = {
        id, type: ["relationship"], iri: null, name: {}, description: {},
        technicalLabel: resource.pimTechnicalLabel ?? null,
        ends: [
          {
            iri: null, name: {}, description: {},
            concept: ids.get(resource.pimOwnerClass!) ?? resource.pimOwnerClass, cardinality: [0, null],
            technicalLabel: null, languageStringRequiredLanguages: [], regex: null, example: null,
          },
          {
            iri: resource.pimInterpretation ?? null,
            name: resource.pimHumanLabel ?? {},
            description: resource.pimHumanDescription ?? {},
            concept: ids.get(resource.pimDatatype!) ?? resource.pimDatatype ?? "http://www.w3.org/2000/01/rdf-schema#Literal",
            cardinality: [resource.pimCardinalityMin ?? 0, resource.pimCardinalityMax ?? null],
            technicalLabel: resource.pimTechnicalLabel ?? null,
            languageStringRequiredLanguages: resource.pimLanguageStringRequiredLanguages ?? [],
            regex: resource.pimRegex ?? null,
            example: resource.pimExample ?? null,
          },
        ],
      } satisfies ExtendedSemanticModelRelationship;
    } else if (PimAssociation.is(resource)) {
      if (resource.pimEnd.length !== 2) {
        throw new Error(`PIM association "${id}" must have two ends.`);
      }
      entities[id] = {
        id, type: ["relationship"], iri: null,
        name: resource.pimHumanLabel ?? {},
        description: resource.pimHumanDescription ?? {},
        technicalLabel: resource.pimTechnicalLabel ?? null,
        ends: resource.pimEnd.map((endId, index) => {
          const end = resources[endId];
          if (!end || !PimAssociationEnd.is(end)) {
            throw new Error(`PIM association "${id}" has an invalid end "${endId}".`);
          }
          return {
            iri: end.pimInterpretation ?? (index === 1 ? resource.pimInterpretation : null) ?? null,
            name: end.pimHumanLabel ?? (index === 1 ? resource.pimHumanLabel : null) ?? {},
            description: end.pimHumanDescription ?? (index === 1 ? resource.pimHumanDescription : null) ?? {},
            concept: ids.get(end.pimPart!) ?? end.pimPart,
            cardinality: [end.pimCardinalityMin ?? 0, end.pimCardinalityMax ?? null],
            technicalLabel: end.pimTechnicalLabel ?? (index === 1 ? resource.pimTechnicalLabel : null) ?? null,
            languageStringRequiredLanguages: [], regex: null, example: null,
          };
        }),
      } satisfies ExtendedSemanticModelRelationship;
    }
  }
  return entities;
}

/** Resolves legacy PIM identifiers to entities in an application profile. */
function createProfileLookup(resources: Record<string, CoreResource>, profile: EntityRecord) {
  const pimIds = getPimIds(resources);
  for (const resource of Object.values(resources)) {
    if (PimAssociation.is(resource)) {
      for (const end of resource.pimEnd) {
        pimIds.set(end, resource.pimInterpretation ?? resource.iri!);
      }
    }
  }
  const profileIds = new Map<string, string>();
  for (const entity of Object.values(profile)) {
    if (isSemanticModelClassProfile(entity)) {
      for (const id of entity.profiling) profileIds.set(id, entity.id);
    } else if (isSemanticModelRelationshipProfile(entity)) {
      for (const end of entity.ends) {
        for (const id of end.profiling) profileIds.set(id, entity.id);
      }
    }
  }
  return (id: string): string => {
    const result = profileIds.get(pimIds.get(id) ?? id);
    if (!result) throw new Error(`No application profile entity for PIM interpretation "${id}".`);
    return result;
  };
}

/** Legacy OFN datatype suffixes and their XML Schema equivalents. */
const psmDatatypeReplacements = new Map([
  ["boolean", "boolean"],
  ["datum", "date"],
  ["čas", "time"],
  ["datum-a-čas", "dateTime"],
  ["celé-číslo", "integer"],
  ["desetinné-číslo", "decimal"],
  ["url", "anyURI"],
  ["řetězec", "string"],
].map(([ofn, xsd]) => [
  `https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/${ofn}`,
  `http://www.w3.org/2001/XMLSchema#${xsd}`,
]));

/** Rewrites PSM references and legacy datatypes while preserving other serialized properties. */
function remapPsm(
  value: unknown,
  ids: Map<string, string>,
  reuseModels: ReadonlyMap<string, { modelId: string; ids: Map<string, string> }>,
  getProfile: (id: string) => string,
  property = "",
): unknown {
  if (typeof value === "string") {
    if (property === "dataPsmDatatype") return psmDatatypeReplacements.get(value) ?? value;
    if (property === "dataPsmInterpretation" || property === "dataPsmTypes") return getProfile(value);
    return ids.get(value) ?? value;
  }
  if (Array.isArray(value)) return value.map(item => remapPsm(item, ids, reuseModels, getProfile, property));
  if (value && typeof value === "object") {
    const converted = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapPsm(item, ids, reuseModels, getProfile, key)]));
    if (DataPsmClassReference.is(value)) {
      const target = value.dataPsmSpecification === null ? undefined : reuseModels.get(value.dataPsmSpecification);
      converted.dataPsmSpecification = target?.modelId ?? value.dataPsmSpecification;
      converted.dataPsmClass = value.dataPsmClass === null ? null : target?.ids.get(value.dataPsmClass) ?? value.dataPsmClass;
    }
    return converted;
  }
  return value;
}

type LoadedResource = Omit<ResourceRow, "userMetadata" | "dataStoreId"> & {
  userMetadata: unknown;
  dataStoreId: Record<string, string>;
  dataStores: Record<string, unknown>;
  subResources: LoadedResource[];
};

/** Reads a resource subtree and parses all referenced stores. */
async function loadResource(
  resource: ResourceRow,
  children: ReadonlyMap<number, ResourceRow[]>,
  storesDirectory: string,
): Promise<LoadedResource> {
  try {
    const userMetadata: unknown = JSON.parse(resource.userMetadata);
    const storeIds: unknown = JSON.parse(resource.dataStoreId);
    if (storeIds === null || typeof storeIds !== "object" || Array.isArray(storeIds)) {
      throw new Error("Expected a map of store names to IDs.");
    }

    const dataStoreId: Record<string, string> = Object.create(null);
    const dataStores: Record<string, unknown> = Object.create(null);
    for (const [name, id] of Object.entries(storeIds)) {
      if (typeof id !== "string" || !/^[a-zA-Z0-9-]+$/.test(id)) {
        throw new Error(`Invalid store ID for store "${name}".`);
      }
      const filename = path.join(storesDirectory, id);
      try {
        dataStoreId[name] = id;
        dataStores[name] = JSON.parse(await readFile(filename, "utf8"));
      } catch (cause) {
        throw new Error(`Cannot load store "${name}" from "${filename}".`, { cause });
      }
    }

    const subResources: LoadedResource[] = [];
    for (const child of children.get(resource.id) ?? []) {
      subResources.push(await loadResource(child, children, storesDirectory));
    }
    return { ...resource, userMetadata, dataStoreId, dataStores, subResources };
  } catch (cause) {
    throw new Error(`Cannot load resource ${resource.id} (${resource.iri}).`, { cause });
  }
}

/** Loads the legacy database and saves each project as one transaction. */
async function main(): Promise<void> {
  const inputDirectory = process.argv[2];
  if (!inputDirectory || process.argv.length !== 3) {
    throw new Error("Usage: bun services/backend/src/tools/convert-database.ts <input-database-directory>");
  }

  const inputPath = path.resolve(inputDirectory);
  const database = new DatabaseSync(path.join(inputPath, "database.db"), { readOnly: true });
  let resources: ResourceRow[];
  try {
    resources = database.prepare('SELECT * FROM "Resource" ORDER BY "id"').all() as ResourceRow[];
  } finally {
    database.close();
  }

  if (!resources.some(resource => resource.id === 1)) {
    throw new Error("Root resource 1 was not found.");
  }

  const children = new Map<number, ResourceRow[]>();
  for (const resource of resources) {
    if (resource.parentResourceId !== null) {
      const siblings = children.get(resource.parentResourceId) ?? [];
      siblings.push(resource);
      children.set(resource.parentResourceId, siblings);
    }
  }

  const projects: LoadedResource[] = [];
  for (const resource of children.get(1) ?? []) {
    projects.push(await loadResource(resource, children, path.join(inputPath, "stores")));
  }

  // Import the original defaults from the source checkout without copying them.
  const legacyConfigurationPath = process.env.LEGACY_TEMPLATE_CONFIGURATION ??
    path.resolve(inputPath, "../../../packages/template-artifact/src/configuration.ts");
  const { DefaultTemplateArtifactConfiguration } = await import(pathToFileURL(legacyConfigurationPath).href);
  const convertTemplateConfiguration = await createTemplateConfigurationConverter({
    legacyDefaults: DefaultTemplateArtifactConfiguration,
    cacheFile: process.env.TEMPLATE_CONFIGURATION_CACHE ??
      fileURLToPath(new URL("../../template-configuration-cache.json", import.meta.url)),
  });

  // Allocate all identifiers before resolving references between projects.
  const packageIds = new Map<string, string>();
  const reuseModels = new Map<string, { modelId: string; ids: Map<string, string> }>();
  const migrationProjects = projects.flatMap(project => {
    const semanticModel = project.subResources.find(resource => resource.representationType === V1.PIM);
    if (!semanticModel) return [];
    const createProject = createCreateProjectOperation(uuidv4());
    packageIds.set(project.iri, createProject.projectId);
    const psmIds = new Map<string, string>();
    const structures = project.subResources.filter(resource => resource.representationType === V1.PSM).map(resource => {
      const createModel = createCreateModelOperation(createProject.projectId, V1.PSM);
      const store = resource.dataStores.model as { resources: Record<string, CoreResource> };
      const schemas = Object.values(store.resources).filter(DataPsmSchema.is);
      if (schemas.length !== 1) throw new Error(`PSM model "${resource.iri}" must have one schema.`);
      const schema = schemas[0];
      createModel.label = schema.dataPsmHumanLabel ?? {};
      createModel.description = schema.dataPsmHumanDescription ?? {};
      const entityIds = new Map<string, string>();
      for (const [key, entity] of Object.entries(store.resources)) {
        const id = DataPsmSchema.is(entity) ? createModel.modelId : uuidv4();
        entityIds.set(key, id);
        psmIds.set(key, id);
        if (entity.iri !== null) {
          entityIds.set(entity.iri, id);
          psmIds.set(entity.iri, id);
        }
      }
      psmIds.set(resource.iri, createModel.modelId);
      const target = { modelId: createModel.modelId, ids: entityIds };
      reuseModels.set(resource.iri, target);
      if (schema.iri !== null) reuseModels.set(schema.iri, target);
      return { createModel, resources: store.resources };
    });
    return [{ project, semanticModel, createProject, structures, psmIds }];
  });

  const outputDirectory = fileURLToPath(new URL("../../database/", import.meta.url));
  await mkdir(outputDirectory, { recursive: true });
  if (await realpath(inputPath) === await realpath(outputDirectory)) {
    throw new Error("Input and output database directories must differ.");
  }
  const outputPath = path.join(outputDirectory, "database.db");
  const storeModel = new LocalStoreModel(path.join(outputDirectory, "stores"));
  await migrateDatabase(outputPath, storeModel);
  const outputDatabase = createDatabase(outputPath);
  try {
    const storesDirectory = path.join(outputDirectory, "stores");
    await mkdir(storesDirectory, { recursive: true });
    const resourceModel = new ResourceModel(new LocalStoreModel(storesDirectory), outputDatabase);
    const repository = new ModelRepository(resourceModel, new TransactionModel(outputDatabase));
    if (!await resourceModel.getResource(configuration.localRootIri)) {
      await resourceModel.createPackage(null, configuration.localRootIri, configuration.localRootMetadata);
    }
    for (const { project, semanticModel, createProject, structures, psmIds } of migrationProjects) {
      const metadata = project.userMetadata as BaseResource["userMetadata"] | null;
      createProject.description = metadata?.description ?? {};
      const operations: OperationInModel[] = [{modelId: PROJECT_MODEL_ID, operation: createProject}];
      const documentationPartials: Record<string, string | false> = {};

      const packageData = project.dataStores.model as { dataStructuresImportPackages?: string[] } | undefined;
      if (packageData?.dataStructuresImportPackages !== undefined) {
        const imports = packageData.dataStructuresImportPackages.flatMap(id => {
          const mapped = packageIds.get(id);
          return mapped === undefined ? [] : [mapped];
        });
        operations.push({
          modelId: createProject.projectId,
          operation: createUpdateEntityOperation(createProject.projectId, { dataStructuresImportPackages: imports }),
        });
      }

      const configurations = project.subResources.filter(resource => resource.representationType === V1.GENERATOR_CONFIGURATION);
      for (const resource of configurations.length > 0 ? configurations : [undefined]) {
        const store = resource?.dataStores.model;
        const configuration = Object.fromEntries(Object.entries(
          store && typeof store === "object" && !Array.isArray(store) ? store : {},
        ).filter(([key]) =>
          ["json", "csv", "client", "data-specification"].includes(key),
        ));
        if (store && typeof store === "object" && "template-artifact" in store) {
          try {
            const documentationConfiguration = await convertTemplateConfiguration(store["template-artifact"]);
            for (const [name, partial] of Object.entries(documentationConfiguration.partials)) {
              if (Object.hasOwn(documentationPartials, name)) {
                throw new Error(`Documentation partial "${name}" is defined more than once in project "${project.iri}".`);
              }
              documentationPartials[name] = partial;
            }
          } catch (cause) {
            throw new Error(`Cannot convert generator configuration "${resource?.iri}" in project "${project.iri}".`, { cause });
          }
        }
        const createConfiguration = createCreateModelOperation(createProject.projectId, V1.GENERATOR_CONFIGURATION);
        const entities = deserializeModelEntities(createConfiguration.modelId, V1.GENERATOR_CONFIGURATION, configuration);
        operations.push({ modelId: PROJECT_MODEL_ID, operation: createConfiguration });
        operations.push(...diffModelEntitiesToOperations(createConfiguration.modelId, V1.GENERATOR_CONFIGURATION, {}, entities));
      }
      if (Object.keys(documentationPartials).length > 0) {
        operations.push({
          modelId: createProject.projectId,
          operation: createUpdateEntityOperation(createProject.projectId, {
            configuration: {
              [DOCUMENTATION_CONFIGURATION_KEY]: { partials: documentationPartials },
            },
          }),
        });
      }

      const createSemanticModel = createCreateModelOperation(createProject.projectId, LOCAL_SEMANTIC_MODEL);
      operations.push({ modelId: PROJECT_MODEL_ID, operation: createSemanticModel });

      const store = semanticModel.dataStores.model;
      if (!store || typeof store !== "object" || !("resources" in store) ||
        !store.resources || typeof store.resources !== "object" || Array.isArray(store.resources)) {
        throw new Error(`PIM model "${semanticModel.iri}" has no resource map.`);
      }
      const pimResources = store.resources as Record<string, CoreResource>;
      const schema = Object.values(pimResources).find(PimSchema.is);
      const projectLabels = [metadata?.label, schema?.pimHumanLabel].map(label =>
        Object.fromEntries(Object.entries(label ?? {}).filter(([, value]) => value.trim().length > 0)),
      );
      createProject.label = projectLabels.find(label => Object.keys(label).length > 0) ?? { cs: project.iri };
      if (schema) {
        createSemanticModel.label = schema.pimHumanLabel ?? {};
        createSemanticModel.description = schema.pimHumanDescription ?? {};
      }
      const mainSemanticEntity = {
        id: createSemanticModel.modelId, type: [LOCAL_SEMANTIC_MODEL],
        label: createSemanticModel.label ?? {},
        baseIri: null,
        source: {
          type: "subgraph",
          provider: "sgov",
          endpoint: "https://slovník.gov.cz/sparql",
        },
      } satisfies MainSemanticModelEntity & { source: CachedSubgraph };
      operations.push({
        modelId: createSemanticModel.modelId,
        operation: createSetEntityOperation(mainSemanticEntity),
      });
      const newResources = convertPim(pimResources);

      const changes = Object.values(newResources).map(next => ({ previous: null, next }));
      const { operations: converted } = changesToSemanticModelOperations(changes);
      const convertedInModel = converted.map(operation => ({ modelId: createSemanticModel.modelId, operation }));
      operations.push(...convertedInModel);

      const createProfile = createCreateModelOperation(createProject.projectId, LOCAL_SEMANTIC_MODEL);
      createProfile.label = { cs: "Aplikační profil" };
      const profileEntities: EntityRecord = {};
      await SemanticProfileModelOperations.profileEntities({
        targetModel: {
          executeOperations(profileOperations) {
            const { result } = applyOperationsToSemanticModel(profileEntities, profileOperations);
            if (result.some(item => !item.success)) {
              throw new Error(`Cannot profile vocabulary "${semanticModel.iri}".`);
            }
            return result;
          },
        },
      }, { entities: Object.values(newResources) });
      operations.push({ modelId: PROJECT_MODEL_ID, operation: createProfile });
      operations.push(...diffModelEntitiesToOperations(createProfile.modelId, LOCAL_SEMANTIC_MODEL, {}, {
        [createProfile.modelId]: {
          id: createProfile.modelId, type: [LOCAL_SEMANTIC_MODEL],
          label: createProfile.label, baseIri: "",
        } satisfies MainSemanticModelEntity,
        ...profileEntities,
      } as EntityRecord));

      const getProfile = createProfileLookup(pimResources, profileEntities);
      for (const structure of structures) {
        const resources = Object.fromEntries(Object.entries(structure.resources).map(([key, entity]) => {
          const converted = remapPsm(entity, psmIds, reuseModels, getProfile) as CoreResource;
          converted.iri = psmIds.get(key)!;
          return [converted.iri, converted];
        }));
        const modelId = structure.createModel.modelId;
        const entities = deserializeModelEntities(modelId, V1.PSM, { operations: [], resources });
        operations.push({ modelId: PROJECT_MODEL_ID, operation: structure.createModel });
        operations.push(...diffModelEntitiesToOperations(modelId, V1.PSM, {}, entities));
      }

      await repository.applyTransactions(createProject.projectId, [{ id: generateOperationId(), operations }]);
      if (metadata?.tags !== undefined) {
        // Merge tags directly into resource metadata after the project exists.
        await resourceModel.updateResource(createProject.projectId, { tags: metadata.tags });
      }
      console.log(`Migrated project "${project.iri}" to package "${createProject.projectId}".`);
    }
  } finally {
    await outputDatabase.destroy();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
