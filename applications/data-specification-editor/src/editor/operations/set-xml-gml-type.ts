import { DataPsmSetGmlTypeXmlExtension } from "@dataspecer/core/data-psm/xml-extension/operation/index";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetXmlGmlType implements ComplexOperation {
  private readonly forDataPsmResourceIri: string;
  private readonly gmlType: string | null;
  private store!: FederatedObservableStore;

  constructor(forDataPsmResourceIri: string, gmlType: string | null) {
    this.forDataPsmResourceIri = forDataPsmResourceIri;
    this.gmlType = gmlType;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmResourceIri) as string;

    const op = new DataPsmSetGmlTypeXmlExtension();
    op.dataPsmProperty = this.forDataPsmResourceIri;
    op.gmlType = this.gmlType;
    this.store.applyOperation(schema, op);
  }
}
