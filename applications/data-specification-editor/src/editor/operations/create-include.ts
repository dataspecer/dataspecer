import {DataPsmCreateInclude} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class CreateInclude implements ComplexOperation {
  private readonly include: string;
  private readonly ownerClass: string;
  private store!: FederatedObservableStore;

  constructor(include: string, ownerClass: string) {
    this.include = include;
    this.ownerClass = ownerClass;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.include) as string;

    const dataPsmCreateInclude = new DataPsmCreateInclude();
    dataPsmCreateInclude.dataPsmIncludes = this.include;
    dataPsmCreateInclude.dataPsmOwner = this.ownerClass;
    this.store.applyOperation(schema, dataPsmCreateInclude);
  }
}
