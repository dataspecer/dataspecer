import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { EntityModel } from "../entity-model/index.ts";
import { LOCAL_SEMANTIC_MODEL } from "../model/known-models.ts";
import { getSemanticModelMainEntity, isMainSemanticModelEntity } from "./concepts/index.ts";

/**
 * Provides entities as semantic model.
 *
 * It translates generic entities and interprets them as semantic entities.
 *
 * The deprecated view exposes vocabulary entities only. Model metadata stays
 * in the underlying entity record for label access and serialization.
 *
 * @deprecated Use model store instead to manage the model state.
 */
export class SemanticModelAdapter implements EntityModel {
    constructor(protected readonly entityModel: EntityModel) {}

    getId(): string {
        return this.entityModel.getId();
    }

    getAlias(): string | null {
        const label = getSemanticModelMainEntity(this.entityModel.getEntities())?.label;
        return label ? Object.values(label)[0] ?? null : null;
    }

    setAlias(alias: string | null): void {
        const entityModel = this.entityModel as EntityModel & {
            change?: (updated: Record<string, Entity>, removed: string[]) => void;
        };
        if (!entityModel.change) {
            return;
        }

        const current = getSemanticModelMainEntity(entityModel.getEntities());
        const mainEntity = current ?? { id: this.getId(), type: [LOCAL_SEMANTIC_MODEL] };
        const nextEntity = Object.assign({}, mainEntity, {
            label: alias === null ? {} : { cs: alias },
        }) as Entity;
        entityModel.change({
            [mainEntity.id]: nextEntity,
        }, []);
    }

    getEntities(): EntityRecord {
        return Object.fromEntries(Object.entries(this.entityModel.getEntities())
            .filter(([, entity]) => !isMainSemanticModelEntity(entity)));
    }

    subscribeToChanges(callback: (updated: EntityRecord, removed: string[]) => void): () => void {
        return this.entityModel.subscribeToChanges((updated, removed) => {
            const updatedEntities = Object.fromEntries(Object.entries(updated)
                .filter(([, entity]) => !isMainSemanticModelEntity(entity)));
            const removedEntities = removed.filter(id => id !== this.getId());
            if (Object.keys(updatedEntities).length > 0 || removedEntities.length > 0) {
                callback(updatedEntities, removedEntities);
            }
        });
    }
}
