import {DataPsmSetTechnicalLabel} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetTechnicalLabel implements ComplexOperation {
  private readonly forDataPsmResourceIri: string;
  private readonly dataPsmTechnicalLabel: string;
  private store!: FederatedObservableStore;

  constructor(forDataPsmResourceIri: string, dataPsmTechnicalLabel: string) {
    this.forDataPsmResourceIri = forDataPsmResourceIri;
    this.dataPsmTechnicalLabel = dataPsmTechnicalLabel;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmResourceIri) as string;

    const technicalLabel = this.dataPsmTechnicalLabel === "" ? null : this.dataPsmTechnicalLabel;

    const dataPsmSetTechnicalLabel = new DataPsmSetTechnicalLabel();
    dataPsmSetTechnicalLabel.dataPsmResource = this.forDataPsmResourceIri;
    dataPsmSetTechnicalLabel.dataPsmTechnicalLabel = technicalLabel;
    this.store.applyOperation(schema, dataPsmSetTechnicalLabel);
  }
}
