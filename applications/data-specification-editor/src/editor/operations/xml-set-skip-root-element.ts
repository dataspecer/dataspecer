import { DataPsmSetXmlSkipRootElement } from "@dataspecer/core/data-psm/xml-extension/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class XmlSetSkipRootElement implements ComplexOperation {
    private readonly forDataPsmSchemaIri: string;
    private store!: FederatedObservableStore;
    skipRootElement: boolean;

    constructor(forDataPsmSchemaIri: string, skipRootElement: boolean) {
        this.forDataPsmSchemaIri = forDataPsmSchemaIri;
        this.skipRootElement = skipRootElement;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    execute(): void {
        const operation = new DataPsmSetXmlSkipRootElement();
        operation.dataPsmSchema = this.forDataPsmSchemaIri;
        operation.skipRootElement = this.skipRootElement;
        this.store.applyOperation(this.forDataPsmSchemaIri, operation);
    }
}
