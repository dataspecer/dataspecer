import {DataPsmUnsetChoice} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Removes a choice from OR. Choice is identified by IRI because the choice
 * array is a set of unique objects.
 */
export class DeleteChoice implements ComplexOperation {
  private OrIri: string;
  private choiceIri: string;
  private store!: FederatedObservableStore;

  constructor(OrIri: string, choiceIri: string) {
    this.OrIri = OrIri;
    this.choiceIri = choiceIri;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.OrIri) as string;

    const dataPsmUnsetChoice = new DataPsmUnsetChoice();
    dataPsmUnsetChoice.dataPsmOr = this.OrIri;
    dataPsmUnsetChoice.dataPsmChoice = this.choiceIri;
    this.store.applyOperation(schema, dataPsmUnsetChoice);
  }
}
