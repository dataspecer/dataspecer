import { DataPsmSetChoice } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Adds new class to the OR and tries to create inheritance chain to PIM.
 */
export class MakeConcrete implements ComplexOperation {
  private store!: FederatedObservableStore;
  private readonly dataPsmOrIri: string;
  private readonly classId: string;

  constructor(dataPsmOrIri: string, classId: string) {
    this.dataPsmOrIri = dataPsmOrIri;
    this.classId = classId;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const dataPsmSchema = this.store.getSchemaForResource(this.dataPsmOrIri) as string;

    const dataPsmSetChoice = new DataPsmSetChoice();
    dataPsmSetChoice.dataPsmOr = this.dataPsmOrIri;
    dataPsmSetChoice.dataPsmChoice = this.classId;
    this.store.applyOperation(dataPsmSchema, dataPsmSetChoice);
  }
}
