import {DataPsmUnwrapOr} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class UnwrapOr implements ComplexOperation {
  private readonly or: string;
  private store!: FederatedObservableStore;

  constructor(or: string) {
    this.or = or;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.or) as string;

    const dataPsmUnwrapOr = new DataPsmUnwrapOr();
    dataPsmUnwrapOr.dataPsmOr = this.or;
    this.store.applyOperation(schema, dataPsmUnwrapOr);
  }
}
