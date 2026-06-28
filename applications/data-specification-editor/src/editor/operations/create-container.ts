import { DataPsmCreateContainer, DataPsmSetCardinality } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class CreateContainer implements ComplexOperation {
  private readonly ownerClass: string;
  private readonly type: string;
  private store!: FederatedObservableStore;

  constructor(ownerClass: string, type: string) {
    this.ownerClass = ownerClass;
    this.type = type;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.ownerClass) as string;

    const op = new DataPsmCreateContainer();
    op.dataPsmOwner = this.ownerClass;
    op.dataPsmContainerType = this.type;
    this.store.applyOperation(schema, op);

    const cardinality = new DataPsmSetCardinality();
    cardinality.dataPsmCardinality = [1, 1];
    cardinality.entityId = op.dataPsmNewIri as string;
    this.store.applyOperation(schema, cardinality);
  }
}
