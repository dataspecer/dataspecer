import { DataSpecification } from '@dataspecer/backend-utils/connectors/specification';
import { SemanticModelClass, SemanticModelEntity } from '@dataspecer/core-v2/semantic-model/concepts';
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { OperationContext } from "../../editor/operations/context/operation-context";
import { SemanticModelAggregator } from '@dataspecer/core-v2/hierarchical-semantic-aggregator';
import type { MemoryStoreFromBlob } from '@dataspecer/specification/memory-store';

/**
 * Editor's configuration (or context) that specifies how the editor should work.
 * It contains source and target semantic models, data specifications, and other properties.
 */
export interface Configuration {
    store: FederatedObservableStore,
    dataSpecifications: { [iri: string]: DataSpecification };
    dataSpecificationIri: string|null;
    dataPsmSchemaIri: string|null;
    operationContext: OperationContext,

    /**
     * todo experimental
     */
    semanticModelAggregator: SemanticModelAggregator;

    /**
     * Individual structure models mapped by their IRIs.
     * All of them are registered in the `store` as well.
     */
    structureModels: Record<string, MemoryStoreFromBlob>;
}

/**
 * These are the functions that are needed by the source semantic model in order to work properly.
 */
export interface SourceSemanticModelInterface {
    search(searchQuery: string): Promise<SemanticModelClass[]>;
    searchSync?: (searchQuery: string) => SemanticModelClass[];
    getSurroundings(iri: string): Promise<SemanticModelEntity[]>;
    getSurroundingsSync?: (iri: string) => SemanticModelEntity[];
    getFullHierarchy(iri: string): Promise<SemanticModelEntity[]>;
    getFullHierarchySync?: (iri: string) => SemanticModelEntity[];
}

export interface SearchableSemanticModelSync {
    searchEntitySync(searchQuery: string): SemanticModelClass[];
}

export function isSourceSemanticModelSearchableSync(model: any): model is SearchableSemanticModelSync {
    return model && (model as SearchableSemanticModelSync).searchEntitySync !== undefined;
}
