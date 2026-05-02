import {DataPsmSetDatatype} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetDataPsmDatatype implements ComplexOperation {
  private readonly forDataPsmAttributeIri: string;
  private readonly datatype: string | null;
  private store!: FederatedObservableStore;

  constructor(forDataPsmAttributeIri: string, datatype: string | null) {
    this.forDataPsmAttributeIri = forDataPsmAttributeIri;
    this.datatype = datatype;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmAttributeIri) as string;


    let datatype = this.datatype;
    if (datatype === "") {
      console.warn("SetDataPsmDatatype ComplexOperation: Datatype should not be an empty string. Setting it to null.");
      datatype = null;
    }

    const dataPsmSetDatatype = new DataPsmSetDatatype();
    dataPsmSetDatatype.dataPsmAttribute = this.forDataPsmAttributeIri;
    dataPsmSetDatatype.dataPsmDatatype = datatype;
    this.store.applyOperation(schema, dataPsmSetDatatype);
  }
}
