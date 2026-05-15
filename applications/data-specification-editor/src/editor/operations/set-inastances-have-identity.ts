import {DataPsmSetInstancesHaveIdentity} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetInstancesHaveIdentity implements ComplexOperation {
  private readonly forDataPsmClass: string;
  private readonly instancesHaveIdentity: undefined | "ALWAYS" | "NEVER" | "OPTIONAL";
  private store!: FederatedObservableStore;

  constructor(forDataPsmClass: string, instancesHaveIdentity: undefined | "ALWAYS" | "NEVER" | "OPTIONAL") {
    this.forDataPsmClass = forDataPsmClass;
    this.instancesHaveIdentity = instancesHaveIdentity;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmClass) as string;


    const psmSetInstancesHaveIdentity = new DataPsmSetInstancesHaveIdentity();
    psmSetInstancesHaveIdentity.dataPsmClass = this.forDataPsmClass;
    psmSetInstancesHaveIdentity.instancesHaveIdentity = this.instancesHaveIdentity;
    this.store.applyOperation(schema, psmSetInstancesHaveIdentity);
  }
}
