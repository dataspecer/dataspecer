import { CoreResourceReader, type LanguageString } from "@dataspecer/core/core";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { deepEqual } from "@dataspecer/utilities";
import { Entity } from "../../entity-model/entity.ts";
import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import { transformCoreResources } from "./transform-core-resources.ts";
import { RDFS_MODEL } from "../../model/known-models.ts";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { buildPimResources } from "./transform-semantic-to-pim.ts";

export class PimStoreWrapper extends InMemoryEntityModel {
    private pimStore: CoreResourceReader;
    private urls?: string[];

    private label: LanguageString = {};

    /**
     * Maps the old id of PimAssociationEnd to the new id of SemanticModelRelationship and if it is a source (true) or target (false).
     */
    public relationshipMapping: Record<string, [string, boolean]> = {};

    constructor(pimStore: CoreResourceReader, id?: string, alias?: string, urls?: string[], label?: LanguageString) {
        super(id);
        this.pimStore = pimStore;
        this.alias = alias;
        this.urls = urls;
        this.label = label ?? (alias ? { en: alias } : {});
    }

    public fetchFromPimStore() {
        const result = transformCoreResources((this.pimStore as any).resources, this.relationshipMapping);

        const deleted: string[] = [];
        const updated: Record<string, Entity> = {};

        const currentEntities = this.getEntities();

        // First remove entities that are not present
        const oldIris = Object.keys(currentEntities);
        for (const iri of oldIris) {
            if (!result[iri]) {
                deleted.push(iri);
            }
        }

        // Update new
        for (const iri in result) {
            const entity = result[iri];
            if (!deepEqual(entity, currentEntities[iri])) {
                updated[iri] = entity!;
            }
        }

        this.change(updated, deleted);
    }

    serializeModel() {
        return {
            type: RDFS_MODEL,
            id: this.id,
            alias: this.alias,
            pimStore: this.pimStore,
            urls: this.urls,
            label: this.label,
        };
    }
}

/**
 * Converts PIM serialization (js object) into an entity record with semantic
 * entities.
 */
export function serializationToPimModelEntities(serialization: object): {
  adapter: PimStoreWrapper;
  entities: EntityRecord;
} {
  const modelData = {...serialization} as any;
  const adapter = new PimStoreWrapper(modelData.pimStore, modelData.id, "model", modelData.urls, modelData.label);
  adapter.fetchFromPimStore();

  delete modelData.pimStore;

  /**
   * The main entity represents the model itself. Currently it is just a dump
   * of the data from the root of the blob.
   */
  const mainEntity = {
    ...modelData,
    id: modelData.id,
    type: [],
  } satisfies Entity;

  if (!mainEntity.label || Object.keys(mainEntity.label).length === 0) {
    mainEntity.label = {};
    if (mainEntity.alias) {
      mainEntity.label.en = mainEntity.alias;
    }
  }

  delete mainEntity.alias;

  const entities = {
    ...adapter.getEntities(),
    [mainEntity.id]: mainEntity,
  };

  return {
    entities,
    adapter,
  };
}

/**
 * Serializes the RDFS (PIM store wrapper) model. Inverse of
 * {@link serializationToPimModelEntities}.
 */
export function rdfsModelToSerialization(modelId: ModelIdentifier, entities: EntityRecord): unknown {
  const mainEntity = entities[modelId];
  const mainEntityMetadata: Partial<typeof mainEntity> = {
    ...mainEntity,
  };
  delete mainEntityMetadata.id;
  delete mainEntityMetadata.type;

  return {
    ...mainEntityMetadata,
    type: RDFS_MODEL,
    id: modelId,
    pimStore: { resources: buildPimResources(entities, modelId) },
  };
}
