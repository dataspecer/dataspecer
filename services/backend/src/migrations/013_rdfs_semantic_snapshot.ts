import { randomUUID } from "node:crypto";
import type { MigrationContext } from "../migration-utils/migration-runner.ts";
import type { LanguageString } from "@dataspecer/lightweight-owl";
import type { InMemoryBackupDirectory } from "../export-import/import-backup.ts";

const LEGACY_RDFS_MODEL = "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";
const SEMANTIC_MODEL = "http://dataspecer.com/resources/local/semantic-model";
const PIM_CLASS = "https://ofn.gov.cz/slovník/pim/Class";
const PIM_ASSOCIATION = "https://ofn.gov.cz/slovník/pim/Association";
const PIM_ATTRIBUTE = "https://ofn.gov.cz/slovník/pim/Attribute";

type Entity = { id: string; [key: string]: unknown };

interface PimResource {
  iri: string;
  types: string[];
  pimInterpretation?: string | null;
  pimHumanLabel?: LanguageString | null;
  pimHumanDescription?: LanguageString | null;
  pimHumanLabelProperty?: string | null;
  pimHumanDescriptionProperty?: string | null;
  pimExtends?: string[];
  pimIsCodelist?: boolean;
  pimCodelistUrl?: string[];
  pimEnd?: string[];
  pimPart?: string | null;
  pimCardinalityMin?: number | null;
  pimCardinalityMax?: number | null;
  pimOwnerClass?: string;
  pimDatatype?: string | null;
}

export async function up({ nodeDatabaseSync, storeModel }: MigrationContext): Promise<void> {
  const resources = nodeDatabaseSync.prepare("SELECT id, iri, dataStoreId, userMetadata FROM Resource WHERE representationType = ?").all(LEGACY_RDFS_MODEL);
  if (resources.length === 0) return;
  if (!storeModel) throw new Error("The RDFS snapshot migration requires a store model.");
  const update = nodeDatabaseSync.prepare("UPDATE Resource SET representationType = ?, dataStoreId = ?, userMetadata = ? WHERE id = ?");
  for (const resource of resources) {
    const stores = JSON.parse(String(resource.dataStoreId)) as Record<string, string>;
    const metadata = JSON.parse(String(resource.userMetadata)) as Record<string, unknown>;
    const storeId = stores.model ?? randomUUID();
    const stored = await storeModel.get(storeId);
    const model = migrateRdfsSnapshot(String(resource.iri), stored === null ? null : JSON.parse(stored.toString("utf8")), metadata.label as LanguageString | undefined);
    await storeModel.set(storeId, JSON.stringify(model));
    update.run(SEMANTIC_MODEL, JSON.stringify({ ...stores, model: storeId }), JSON.stringify({ ...metadata, label: model.label }), resource.id);
  }
}

export function upBackupFile(directory: InMemoryBackupDirectory): void {
  for (const [fileName, value] of directory.files) {
    if (fileName !== ".meta.json" && !/^[-0-9a-zA-Z]+\.meta\.json$/.test(fileName)) continue;
    const metadata = value as Record<string, unknown>;
    if (!Array.isArray(metadata.types) || !metadata.types.includes(LEGACY_RDFS_MODEL)) continue;
    const modelFile = fileName.replace(/\.meta\.json$/, ".model.json");
    const userMetadata = (metadata.userMetadata ?? {}) as Record<string, unknown>;
    const model = migrateRdfsSnapshot(String(metadata.iri), directory.files.get(modelFile), userMetadata.label as LanguageString | undefined);
    directory.files.set(modelFile, model);
    metadata.types = metadata.types.map(type => type === LEGACY_RDFS_MODEL ? SEMANTIC_MODEL : type);
    metadata.userMetadata = { ...userMetadata, label: model.label };
  }
  for (const child of directory.directories.values()) upBackupFile(child);
}

function migrateRdfsSnapshot(modelId: string, stored: unknown, fallbackLabel: LanguageString = {}): Record<string, unknown> {
  if (stored !== null && stored !== undefined && (typeof stored !== "object" || Array.isArray(stored))) {
    throw new Error(`Invalid RDFS model ${modelId}.`);
  }
  const model = (stored ?? {}) as Record<string, unknown>;
  // Blob writes are outside the database transaction and may already have succeeded on a previous attempt.
  if (model.type === SEMANTIC_MODEL) {
    return model;
  }
  const { pimStore, urls = [], alias, modelAlias: _modelAlias, id: _id, type: _type, ...metadata } = model;
  if (!Array.isArray(urls) || !urls.every(url => typeof url === "string")) {
    throw new Error(`Invalid RDFS URLs in model ${modelId}.`);
  }
  let resources: Record<string, PimResource> = {};
  if (stored !== null && stored !== undefined) {
    if (!pimStore || typeof pimStore !== "object" || !("resources" in pimStore)
      || !pimStore.resources || typeof pimStore.resources !== "object" || Array.isArray(pimStore.resources)) {
      throw new Error(`Invalid PIM resources in model ${modelId}.`);
    }
    resources = pimStore.resources as Record<string, PimResource>;
  }
  const label = model.label && typeof model.label === "object" && Object.keys(model.label).length > 0
    ? model.label as LanguageString
    : typeof alias === "string" && alias.length > 0 ? { en: alias } : fallbackLabel;
  const entities = convertPimResources(resources);
  delete entities[modelId];
  return {
    ...metadata,
    id: modelId,
    modelId,
    type: SEMANTIC_MODEL,
    label,
    source: { type: "snapshot", provider: "rdfs", urls },
    entities,
  };
}

function createGeneralization(child: string, parent: string): Entity {
  return {
    id: "https://dataspecer.com/semantic-models/generalization" + new URLSearchParams({ fromIri: child, toIri: parent }).toString(),
    iri: null,
    type: ["generalization"],
    child,
    parent,
  };
}

function convertPimResources(resources: Record<string, PimResource>): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  for (const resource of Object.values(resources)) {
    if (resource.types.includes(PIM_CLASS)) {
      // Preserve the former wrapper's exclusion of owl:Thing.
      if (resource.iri === "http://www.w3.org/2002/07/owl#Thing") continue;
      const entity: Entity = {
        id: resource.iri,
        iri: resource.pimInterpretation ?? null,
        name: resource.pimHumanLabel ?? {},
        description: resource.pimHumanDescription ?? {},
        nameProperty: resource.pimHumanLabelProperty ?? null,
        descriptionProperty: resource.pimHumanDescriptionProperty ?? null,
        type: ["class"],
      };
      if (resource.pimIsCodelist) {
        entity.isCodelist = true;
        entity.codelistUrl = resource.pimCodelistUrl;
      }
      entities[entity.id] = entity;
      for (const parent of resource.pimExtends ?? []) {
        const generalization = createGeneralization(entity.id, parent);
        entities[generalization.id] = generalization;
      }
    }
    if (resource.types.includes(PIM_ASSOCIATION)) {
      const left = resources[resource.pimEnd![0]];
      const right = resources[resource.pimEnd![1]];
      const entity: Entity = {
        id: resource.iri,
        iri: null,
        type: ["relationship"],
        name: resource.pimHumanLabel ?? {},
        description: resource.pimHumanDescription ?? {},
        nameProperty: resource.pimHumanLabelProperty ?? null,
        descriptionProperty: resource.pimHumanDescriptionProperty ?? null,
        ends: [
          {
            cardinality: ((left.pimCardinalityMin ?? 0) === 0 && left.pimCardinalityMax === null) ? undefined : [left.pimCardinalityMin ?? 0, left.pimCardinalityMax],
            name: left.pimHumanLabel ?? {},
            description: left.pimHumanDescription ?? {},
            nameProperty: left.pimHumanLabelProperty ?? null,
            descriptionProperty: left.pimHumanDescriptionProperty ?? null,
            concept: left.pimPart,
            iri: null,
          },
          {
            cardinality: [right.pimCardinalityMin ?? 0, right.pimCardinalityMax],
            name: right.pimHumanLabel ?? resource.pimHumanLabel ?? {},
            description: right.pimHumanDescription ?? resource.pimHumanDescription ?? {},
            nameProperty: right.pimHumanLabelProperty ?? resource.pimHumanLabelProperty ?? null,
            descriptionProperty: right.pimHumanDescriptionProperty ?? resource.pimHumanDescriptionProperty ?? null,
            concept: right.pimPart,
            iri: resource.pimInterpretation ?? null,
          },
        ],
      };
      entities[entity.id] = entity;
      for (const parent of resource.pimExtends ?? []) {
        const generalization = createGeneralization(entity.id, parent);
        entities[generalization.id] = generalization;
      }
    }
    if (resource.types.includes(PIM_ATTRIBUTE)) {
      const entity: Entity = {
        id: resource.iri,
        iri: null,
        type: ["relationship"],
        name: {},
        description: {},
        nameProperty: null,
        descriptionProperty: null,
        ends: [
          {
            cardinality: [0, null],
            name: {},
            description: {},
            nameProperty: null,
            descriptionProperty: null,
            concept: resource.pimOwnerClass,
            iri: null,
          },
          {
            cardinality: [resource.pimCardinalityMin ?? 0, resource.pimCardinalityMax],
            name: resource.pimHumanLabel ?? {},
            description: resource.pimHumanDescription ?? {},
            nameProperty: resource.pimHumanLabelProperty ?? null,
            descriptionProperty: resource.pimHumanDescriptionProperty ?? null,
            concept: resource.pimDatatype ?? "http://www.w3.org/2000/01/rdf-schema#Literal",
            iri: resource.pimInterpretation ?? null,
          },
        ],
      };
      entities[entity.id] = entity;
      for (const parent of resource.pimExtends ?? []) {
        const generalization = createGeneralization(entity.id, parent);
        entities[generalization.id] = generalization;
      }
    }
  }
  return entities;
}
