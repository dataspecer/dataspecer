import { DataPsmSetEmptyAsComplex } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetEmptyAsComplex implements ComplexOperation {
  private readonly forDataPsmClass: string;
  private readonly emptyAsComplex: boolean;
  private store!: FederatedObservableStore;

  constructor(forDataPsmClass: string, emptyAsComplex: boolean) {
    this.forDataPsmClass = forDataPsmClass;
    this.emptyAsComplex = emptyAsComplex;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmClass) as string;

    const psmSetEmptyAsComplex = new DataPsmSetEmptyAsComplex();
    psmSetEmptyAsComplex.dataPsmClass = this.forDataPsmClass;
    psmSetEmptyAsComplex.dataPsmEmptyAsComplex = this.emptyAsComplex;
    this.store.applyOperation(schema, psmSetEmptyAsComplex);
  }
}
