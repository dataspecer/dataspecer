import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";
import { WritableSemanticModelAdapter } from "../writable-semantic-model-adapter.ts";

/**
 * @deprecated Use model store instead to manage the model state.
 */
export class InMemorySemanticModel extends WritableSemanticModelAdapter {
    private baseIri: string = "";
    public modelMetadata: object = {};

    constructor() {
        super(new InMemoryEntityModel());
    }

    getBaseIri() {
        return this.baseIri;
    }

    setBaseIri(iri: string) {
        this.baseIri = iri;
    }

    serializeModel() {
        return {
            type: LOCAL_SEMANTIC_MODEL,
            ...this.modelMetadata,

            modelId: this.getId(),
            modelAlias: this.getAlias(),
            baseIri: this.baseIri ?? "",
            entities: this.entityModel.entities,
        };
    }

    deserializeModel(data: object) {
        const modelDescriptor = {...data} as any;

        this.baseIri = modelDescriptor.baseIri;
        delete modelDescriptor.baseIri;
        this.entityModel.id = modelDescriptor.modelId;
        delete modelDescriptor.modelId;
        this.entityModel.alias = modelDescriptor.modelAlias;
        delete modelDescriptor.modelAlias;
        this.entityModel.entities = modelDescriptor.entities;
        delete modelDescriptor.entities;

        this.modelMetadata = modelDescriptor;

        return this;
    }
}
