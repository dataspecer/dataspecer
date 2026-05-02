import { DataPsmSetUseKeyValueForLangString } from "@dataspecer/core/data-psm/json-extension/operation/index";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetJsonKeyValueForLangString implements ComplexOperation {
  private readonly forDataPsmResourceIri: string;
  private readonly useKeyValueForLangString: boolean;
  private store!: FederatedObservableStore;

  constructor(forDataPsmResourceIri: string, useKeyValueForLangString: boolean) {
    this.forDataPsmResourceIri = forDataPsmResourceIri;
    this.useKeyValueForLangString = useKeyValueForLangString;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmResourceIri) as string;

    const op = new DataPsmSetUseKeyValueForLangString();
    op.dataPsmProperty = this.forDataPsmResourceIri;
    op.useKeyValueForLangString = this.useKeyValueForLangString;
    this.store.applyOperation(schema, op);
  }
}
