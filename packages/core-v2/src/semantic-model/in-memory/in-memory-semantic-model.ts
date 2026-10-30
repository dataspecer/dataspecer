import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import type { Entities, Entity } from "../../entity-model/entity.ts";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";
import {
    semanticModelEntitiesToSerialization,
    serializationToSemanticModelEntities,
    WritableSemanticModelAdapter,
} from "../writable-semantic-model-adapter.ts";
import { getSemanticModelMainEntity } from "../concepts/concepts-utils.ts";

/**
 * @deprecated Use model store instead to manage the model state.
 */
export class InMemorySemanticModel extends WritableSemanticModelAdapter {
    private baseIri: string = "";
    public modelMetadata: object = {};

    constructor() {
        super(new InMemoryEntityModel());
        const id = this.getId();
        this.entityModel.entities[id] = { id, type: [LOCAL_SEMANTIC_MODEL], label: {} } as Entity;
    }

    getBaseIri() {
        return this.baseIri;
    }

    setBaseIri(iri: string) {
        if (this.getMainEntity()?.source) {
            throw new Error("Semantic models having source specified cannot be directly modified.");
        }
        this.baseIri = iri;
    }

    serializeModel() {
        return {
            ...(semanticModelEntitiesToSerialization(this.entityModel.entities) as object),
            type: LOCAL_SEMANTIC_MODEL,
            baseIri: this.baseIri ?? "",
        };
    }

    fromEntities(entities: Entities) {
        const mainEntity = getSemanticModelMainEntity(entities);
        if (!mainEntity) {
            throw new Error("Expected a semantic model main entity.");
        }
        this.baseIri = mainEntity.baseIri ?? "";
        this.entityModel.id = mainEntity.id;
        this.entityModel.entities = entities;
        this.modelMetadata = {};
        return this;
    }

    deserializeModel(data: object) {
        const modelDescriptor = { ...data } as any;
        const entities = serializationToSemanticModelEntities(modelDescriptor);
        const mainEntity = entities[modelDescriptor.modelId] as any;
        this.baseIri = modelDescriptor.baseIri ?? mainEntity?.baseIri ?? "";
        this.entityModel.id = mainEntity?.id ?? modelDescriptor.modelId ?? this.getId();
        this.entityModel.entities = entities;
        this.modelMetadata = {};

        return this;
    }
}
