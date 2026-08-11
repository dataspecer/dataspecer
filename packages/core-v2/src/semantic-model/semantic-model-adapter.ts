import { Entities, Entity, EntityModel } from "../entity-model/index.ts";

/**
 * Provides entities as semantic model.
 *
 * It translates generic entities and interprets them as semantic entities.
 *
 * Todo: the translation is identity now, but it should be more complex
 *
 * @deprecated Use model store instead to manage the model state.
 */
export class SemanticModelAdapter implements EntityModel {
    constructor(protected readonly entityModel: EntityModel) {}

    getId(): string {
        return this.entityModel.getId();
    }

    getAlias(): string | null {
        return this.entityModel.getAlias();
    }

    setAlias(alias: string | null): void {
        this.entityModel.setAlias(alias);
    }

    getEntities(): Entities {
        return this.entityModel.getEntities();
    }

    subscribeToChanges(callback: (updated: Record<string, Entity>, removed: string[]) => void): () => void {
        return this.entityModel.subscribeToChanges(callback);
    }
}
