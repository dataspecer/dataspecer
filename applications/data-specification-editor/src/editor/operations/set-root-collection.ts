import { DataPsmSetRootCollection } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetRootCollection implements ComplexOperation {
  private readonly rootId: string;
  private readonly enforceRootCollection: boolean;
  private readonly rootCollectionTechnicalLabel: string;

  private store!: FederatedObservableStore;

  constructor(rootId: string, enforceRootCollection: boolean, rootCollectionTechnicalLabel: string) {
    this.rootId = rootId;
    this.enforceRootCollection = enforceRootCollection;
    this.rootCollectionTechnicalLabel = rootCollectionTechnicalLabel;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.rootId) as string;

    const operation = new DataPsmSetRootCollection();
    operation.entityId = this.rootId;
    operation.dataPsmEnforceCollection = this.enforceRootCollection;
    operation.dataPsmCollectionTechnicalLabel = this.rootCollectionTechnicalLabel;

    this.store.applyOperation(schema, operation);
  }
}
