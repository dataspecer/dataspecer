import {DataPsmUnsetChoice, DataPsmUnwrapOr} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";
import {DataPsmClass, DataPsmInclude, DataPsmOr} from "@dataspecer/core/data-psm/model";

/**
 * For a given Data PSM OR that meets conditions to be an inheritance OR, it
 * removes one of its choices (objects) and all other in the include chain.
 */
export class DeleteInheritanceOrSpecialization implements ComplexOperation {
  private readonly ownerOrIri: string;
  private readonly classIriToDelete: string;
  private store!: FederatedObservableStore;

  constructor(ownerOrIri: string, classIriToDelete: string) {
    this.ownerOrIri = ownerOrIri;
    this.classIriToDelete = classIriToDelete;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.ownerOrIri) as string;

    // choice IRI to included iri
    const choiceCache: Record<string, string|null> = {};

    const or = this.store.readResource(this.ownerOrIri) as DataPsmOr;
    for (const choiceIri of or.dataPsmChoices) {
      const choice = this.store.readResource(choiceIri);
      if (!choice || !DataPsmClass.is(choice)) {
        throw new Error("Invalid OR structure");
      }
      const firstItemIri = choice.dataPsmParts[0];
      let includes: string | null = null
      if (firstItemIri) {
        const firstItem = this.store.readResource(firstItemIri);
        if (firstItem && DataPsmInclude.is(firstItem)) {
          includes = firstItem.dataPsmIncludes as string;
        }
      }

      choiceCache[choiceIri as string] = includes;
    }

    const choicesToDelete = [this.classIriToDelete];

    // Go through choiceCache and fill choicesToDelete
    for (let toProcess = 0; toProcess < choicesToDelete.length; toProcess++) {
      const processedChoiceIri = choicesToDelete[toProcess];
      for (const key in choiceCache) {
        if (choiceCache[key] === processedChoiceIri && !choicesToDelete.includes(key)) {
          choicesToDelete.push(key);
        }
      }
    }

    // Delete the choices
    for (const choiceToDelete of choicesToDelete) {
      const dataPsmUnsetChoice = new DataPsmUnsetChoice();
      dataPsmUnsetChoice.dataPsmOr = this.ownerOrIri;
      dataPsmUnsetChoice.dataPsmChoice = choiceToDelete;
      this.store.applyOperation(schema, dataPsmUnsetChoice);
    }

    // Check if unwrap is ok

    if (choicesToDelete.length + 1 === or.dataPsmChoices.length) {
      const unwrap = new DataPsmUnwrapOr();
      unwrap.dataPsmOr = or.iri;
      this.store.applyOperation(schema, unwrap);
    }
  }
}
