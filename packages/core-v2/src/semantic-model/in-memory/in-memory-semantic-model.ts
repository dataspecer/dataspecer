import { InMemoryEntityModel } from "../../entity-model/in-memory-entity-model.ts";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";
import { WritableSemanticModelAdapter } from "../writable-semantic-model-adapter.ts";

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

    /**
     * Sets the generator configuration for this semantic model.
     * This configuration will be used as defaults for all data specifications using this model.
     * @param config Configuration object to store
     */
    setGeneratorConfiguration(config: object): void {
        this.modelMetadata = {
            ...this.modelMetadata,
            generatorConfiguration: config
        };
    }

    /**
     * Retrieves the generator configuration from this semantic model.
     * @returns The generator configuration object or null if not set
     */
    getGeneratorConfiguration(): object | null {
        return (this.modelMetadata as any).generatorConfiguration ?? null;
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
