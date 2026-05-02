import { DataPsmSetIsXmlAttribute } from "@dataspecer/core/data-psm/xml-extension/operation/index";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetXmlIsAttribute implements ComplexOperation {
  private readonly forDataPsmResourceIri: string;
  private readonly isAttribute: boolean;
  private store!: FederatedObservableStore;

  constructor(forDataPsmResourceIri: string, isAttribute: boolean) {
    this.forDataPsmResourceIri = forDataPsmResourceIri;
    this.isAttribute = isAttribute;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmResourceIri) as string;

    const op = new DataPsmSetIsXmlAttribute();
    op.dataPsmProperty = this.forDataPsmResourceIri;
    op.isAttribute = this.isAttribute;
    this.store.applyOperation(schema, op);
  }
}
