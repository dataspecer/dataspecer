import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";
import {LanguageString} from "@dataspecer/core/core";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * todo: This operation can set label only to classes by default as are identified by id.
 */
export class SetPimLabelAndDescription implements ComplexOperation {
  private readonly semanticEntityId: string;
  private readonly label: LanguageString;
  private readonly description: LanguageString;
  private store!: FederatedObservableStore;

  constructor(semanticEntityId: string, label: LanguageString, description: LanguageString) {
    this.semanticEntityId = semanticEntityId;
    this.label = label;
    this.description = description;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const pimSchema = this.store.getSchemaForResource(this.semanticEntityId) as string;

    const operation = modifyClass(this.semanticEntityId, {
      name: this.label,
      description: this.description,
    });
    // @ts-ignore
    this.store.applyOperation(pimSchema, operation);
  }
}
