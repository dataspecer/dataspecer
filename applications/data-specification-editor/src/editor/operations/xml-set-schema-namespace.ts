import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {DataPsmSetNamespaceXmlExtension} from "@dataspecer/core/data-psm/xml-extension/operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class XmlSetSchemaNamespace implements ComplexOperation {
    private readonly forDataPsmSchemaIri: string;
    private readonly namespacePrefix: string | null;
    private readonly namespace: string | null;
    private store!: FederatedObservableStore;

    constructor(forDataPsmSchemaIri: string, namespacePrefix: string | null, namespace: string | null) {
        this.forDataPsmSchemaIri = forDataPsmSchemaIri;
        this.namespacePrefix = namespacePrefix;
        this.namespace = namespace;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    execute(): void {
        const operation = new DataPsmSetNamespaceXmlExtension();
        operation.dataPsmSchema = this.forDataPsmSchemaIri;
        operation.namespace = this.namespace;
        operation.namespacePrefix = this.namespacePrefix;
        this.store.applyOperation(this.forDataPsmSchemaIri, operation);
    }
}
