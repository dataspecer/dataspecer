import {DataPsmSetIsClosed} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetIsClosed implements ComplexOperation {
  private readonly forDataPsmClass: string;
  private readonly isClosed: boolean | null;
  private store!: FederatedObservableStore;

  constructor(forDataPsmClass: string, isClosed: boolean | null) {
    this.forDataPsmClass = forDataPsmClass;
    this.isClosed = isClosed;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmClass) as string;


    const psmSetIsClosed = new DataPsmSetIsClosed();
    psmSetIsClosed.dataPsmClass = this.forDataPsmClass;
    psmSetIsClosed.dataPsmIsClosed = this.isClosed;
    this.store.applyOperation(schema, psmSetIsClosed);
  }
}
