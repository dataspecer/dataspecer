import {DataPsmWrapWithOr} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class WrapWithOr implements ComplexOperation {
  private readonly child: string;
  private store!: FederatedObservableStore;

  constructor(child: string) {
    this.child = child;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.child) as string;

    const dataPsmWrapWithOr = new DataPsmWrapWithOr();
    dataPsmWrapWithOr.dataPsmChild = this.child;
    this.store.applyOperation(schema, dataPsmWrapWithOr);
  }
}
