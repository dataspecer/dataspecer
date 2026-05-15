import {DataPsmCreateOr, DataPsmSetRoots} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Creates new schema with OR as a root.
 *
 * It is expected that the store already contains a schema.
 *
 * Schema roots are overwritten, but the class tree is not removed. This operation expects empty store having only a
 * schema.
 */
export class CreateRootOr implements ComplexOperation {
    private readonly pimSchemaIri: string;
    private readonly dataPsmSchemaIri: string;
    private store!: FederatedObservableStore;

    constructor(pimSchemaIri: string, dataPsmSchemaIri: string) {
        this.pimSchemaIri = pimSchemaIri;
        this.dataPsmSchemaIri = dataPsmSchemaIri;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    execute(): void {
        const createOr = new DataPsmCreateOr();
        const createOrResult = this.store.applyOperation(this.dataPsmSchemaIri, createOr);

        const dataPsmUpdateSchemaRoots = new DataPsmSetRoots();
        dataPsmUpdateSchemaRoots.dataPsmRoots = [createOrResult.created[0]];
        this.store.applyOperation(this.dataPsmSchemaIri, dataPsmUpdateSchemaRoots);
    }
}
