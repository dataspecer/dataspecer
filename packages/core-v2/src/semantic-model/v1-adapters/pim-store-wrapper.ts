import { CoreResourceReader } from "@dataspecer/core/core";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { deepEqual } from "@dataspecer/utilities";
import { Entity } from "../../entity-model/entity.ts";
import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import { transformCoreResources } from "./transform-core-resources.ts";

export class PimStoreWrapper extends InMemoryEntityModel {
    private pimStore: CoreResourceReader;
    private urls?: string[];

    /**
     * Maps the old id of PimAssociationEnd to the new id of SemanticModelRelationship and if it is a source (true) or target (false).
     */
    public relationshipMapping: Record<string, [string, boolean]> = {};

    constructor(pimStore: CoreResourceReader, id?: string, alias?: string, urls?: string[]) {
        super(id);
        this.pimStore = pimStore;
        this.alias = alias;
        this.urls = urls;
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
            // todo fix
            type: "https://dataspecer.com/core/model-descriptor/pim-store-wrapper",
            id: this.id,
            alias: this.alias,
            pimStore: this.pimStore,
            urls: this.urls,
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
  const adapter = new PimStoreWrapper(modelData.pimStore, modelData.id, "model", modelData.urls);
  adapter.fetchFromPimStore();

  delete modelData.pimStore;

  /**
   * The main entity represents the model itself. Currently it is just a dump
   * of the data from the root of the blob.
   */
  const mainEntity = {
    id: modelData.id,
    type: [],
    ...modelData,
  } satisfies Entity;

  const entities = {
    ...adapter.getEntities(),
    [mainEntity.id]: mainEntity,
  };

  return {
    entities,
    adapter,
  };
}
