import {LanguageString} from "@dataspecer/core/core";
import {DataPsmSetHumanDescription, DataPsmSetHumanLabel} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetDataPsmLabelAndDescription implements ComplexOperation {
  private readonly forDataPsmResourceIri: string;
  private readonly dataPsmHumanLabel: LanguageString;
  private readonly dataPsmHumanDescription: LanguageString;
  private store!: FederatedObservableStore;

  constructor(forDataPsmResourceIri: string, dataPsmHumanLabel: LanguageString, dataPsmHumanDescription: LanguageString) {
    this.forDataPsmResourceIri = forDataPsmResourceIri;
    this.dataPsmHumanLabel = dataPsmHumanLabel;
    this.dataPsmHumanDescription = dataPsmHumanDescription;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmResourceIri) as string;

    const dataPsmSetHumanLabel = new DataPsmSetHumanLabel();
    dataPsmSetHumanLabel.dataPsmResource = this.forDataPsmResourceIri;
    dataPsmSetHumanLabel.dataPsmHumanLabel = this.dataPsmHumanLabel;
    this.store.applyOperation(schema, dataPsmSetHumanLabel);

    const dataPsmSetHumanDescription = new DataPsmSetHumanDescription();
    dataPsmSetHumanDescription.dataPsmResource = this.forDataPsmResourceIri;
    dataPsmSetHumanDescription.dataPsmHumanDescription = this.dataPsmHumanDescription;
    this.store.applyOperation(schema, dataPsmSetHumanDescription);
  }
}
