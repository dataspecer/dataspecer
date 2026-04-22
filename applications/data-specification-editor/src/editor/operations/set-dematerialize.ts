import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {DataPsmSetDematerialized} from "@dataspecer/core/data-psm/operation/data-psm-set-dematerialized";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetDematerialize implements ComplexOperation {
  readonly dataPsmAssociationEnd: string;
  readonly dematerialize: boolean;
  private store!: FederatedObservableStore;

  constructor(dataPsmAssociationEnd: string, dematerialize: boolean) {
    this.dataPsmAssociationEnd = dataPsmAssociationEnd;
    this.dematerialize = dematerialize;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.dataPsmAssociationEnd) as string;

    const operation = new DataPsmSetDematerialized();
    operation.dataPsmAssociationEnd = this.dataPsmAssociationEnd;
    operation.dataPsmIsDematerialized = this.dematerialize;
    this.store.applyOperation(schema, operation);
  }
}
