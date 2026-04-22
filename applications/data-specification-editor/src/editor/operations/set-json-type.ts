import {DataPsmSetIdType} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetJsonType implements ComplexOperation {
  private readonly iri: string;
  private readonly value: "DEFAULT" | "OPTIONAL" | "REMOVE";
  private store!: FederatedObservableStore;

  constructor(iri: string, value: "DEFAULT" | "OPTIONAL" | "REMOVE") {
    this.iri = iri;
    this.value = value;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.iri) as string;

    const pimSetExample = new DataPsmSetIdType();
    pimSetExample.dataPsmResource = this.iri;
    switch (this.value) {
      case "DEFAULT":
        pimSetExample.jsonTypeKeyAlias = undefined;
        pimSetExample.jsonTypeRequired = undefined;
        break;
      case "OPTIONAL":
        pimSetExample.jsonTypeKeyAlias = undefined;
        pimSetExample.jsonTypeRequired = false;
        break;
      case "REMOVE":
        pimSetExample.jsonTypeKeyAlias = null;
        pimSetExample.jsonTypeRequired = undefined;
        break;
    }
    this.store.applyOperation(schema, pimSetExample);
  }
}
