import { Entity } from "@dataspecer/core-v2";
import { ExtendedSemanticModelClass, ExtendedSemanticModelRelationshipEnd, isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { modifyClass, modifyRelation } from "@dataspecer/core-v2/semantic-model/operations";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetExample implements ComplexOperation {
  private readonly semanticEntityId: string;
  private readonly examples: string[] | null;
  private store!: FederatedObservableStore;

  constructor(semanticEntityId: string, examples: string[] | null) {
    this.semanticEntityId = semanticEntityId;
    this.examples = examples;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.semanticEntityId) as string;
    const entity = this.store.readResource(this.semanticEntityId) as Entity | null;

    let examples = this.examples;
    if (examples && examples.length === 0) {
      console.warn("SetExample ComplexOperation: examples should not be an empty array. Setting it to null.");
      examples = null;
    }

    if (!entity || !(isSemanticModelRelationship(entity) || isSemanticModelClass(entity))) {
      throw new Error(`Entity with id ${this.semanticEntityId} not found or is not a class or relationship`);
    }

    if (isSemanticModelRelationship(entity)) {
      // It is an attribute and we are setting the end 1
      const operation = modifyRelation(this.semanticEntityId, {
        ends: [
          {} as ExtendedSemanticModelRelationshipEnd,
          {
            example: examples,
          } as ExtendedSemanticModelRelationshipEnd,
        ],
      });
      // @ts-ignore
      this.store.applyOperation(schema, operation);
    } else {
      // We are modifying class
      const operation = modifyClass(this.semanticEntityId, {
        example: examples,
      } as ExtendedSemanticModelClass);
      // @ts-ignore
      this.store.applyOperation(schema, operation);
    }
  }
}
