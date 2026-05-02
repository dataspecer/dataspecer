import { ExtendedSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetObjectExample implements ComplexOperation {
  private readonly semanticEntityId: string;
  private readonly examples: any[] | null;
  private store!: FederatedObservableStore;

  constructor(semanticEntityId: string, examples: any[] | null) {
    this.semanticEntityId = semanticEntityId;
    this.examples = examples;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.semanticEntityId) as string;

    let examples = this.examples;
    if (examples && examples.length === 0) {
      console.warn("SetExample ComplexOperation: examples should not be an empty array. Setting it to null.");
      examples = null;
    }

    const operation = modifyClass(this.semanticEntityId, {
      example: examples,
    } as ExtendedSemanticModelClass);
    // @ts-ignore
    this.store.applyOperation(schema, operation);
  }
}
