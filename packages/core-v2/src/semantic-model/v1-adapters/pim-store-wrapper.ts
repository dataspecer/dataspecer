import { CoreResourceReader } from "@dataspecer/core/core";
import { Entity } from "../../entity-model/entity.ts";
import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import { deepEqual } from "@dataspecer/utilities";
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
