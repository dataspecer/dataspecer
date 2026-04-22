import {DataPsmSetInstancesSpecifyTypes} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetInstancesSpecifyTypes implements ComplexOperation {
  private readonly forDataPsmClass: string;
  private readonly instancesSpecifyTypes: undefined | "ALWAYS" | "NEVER" | "OPTIONAL";
  private store!: FederatedObservableStore;

  constructor(forDataPsmClass: string, instancesSpecifyTypes: undefined | "ALWAYS" | "NEVER" | "OPTIONAL") {
    this.forDataPsmClass = forDataPsmClass;
    this.instancesSpecifyTypes = instancesSpecifyTypes;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmClass) as string;


    const psmSetInstancesSpecifyTypes = new DataPsmSetInstancesSpecifyTypes();
    psmSetInstancesSpecifyTypes.dataPsmClass = this.forDataPsmClass;
    psmSetInstancesSpecifyTypes.instancesSpecifyTypes = this.instancesSpecifyTypes;
    this.store.applyOperation(schema, psmSetInstancesSpecifyTypes);
  }
}
