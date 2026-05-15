import { Entity } from "@dataspecer/core-v2";
import { ExtendedSemanticModelClass, ExtendedSemanticModelRelationshipEnd, isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { modifyClass, modifyRelation } from "@dataspecer/core-v2/semantic-model/operations";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetRegex implements ComplexOperation {
  private readonly entityId: string;
  private readonly regex: string | null;
  private store!: FederatedObservableStore;

  constructor(entityId: string, regex: string | null) {
    this.entityId = entityId;
    this.regex = regex;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.entityId) as string;
    const entity = this.store.readResource(this.entityId) as Entity | null;

    let regex = this.regex;
    if (regex === "") {
      console.warn("SetRegex ComplexOperation: regex should not be an empty string. Setting it to undefined.");
      regex = null;
    }

    if (!entity || !(isSemanticModelRelationship(entity) || isSemanticModelClass(entity))) {
      throw new Error(`Entity with id ${this.entityId} not found or is not a class or relationship`);
    }

    if (isSemanticModelRelationship(entity)) {
      // It is an attribute and we are setting the end 1
      const operation = modifyRelation(this.entityId, {
        ends: [
          {} as ExtendedSemanticModelRelationshipEnd,
          {
            regex,
          } as ExtendedSemanticModelRelationshipEnd,
        ],
      });
      // @ts-ignore
      this.store.applyOperation(schema, operation);
    } else {
      // We are modifying class
      const operation = modifyClass(this.entityId, {
        regex,
      } as ExtendedSemanticModelClass);
      // @ts-ignore
      this.store.applyOperation(schema, operation);
    }
  }
}
