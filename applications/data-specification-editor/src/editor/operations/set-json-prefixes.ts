import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { DataPsmSetJsonLdDefinedPrefixes } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetJsonPrefixes implements ComplexOperation {
  private readonly entityId: string;
  private readonly prefixes: Record<string, string>;
  private store!: FederatedObservableStore;

  constructor(entityId: string, prefixes: Record<string, string>) {
    this.entityId = entityId;
    this.prefixes = prefixes;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.entityId) as string;
    const entity = this.store.readResource(this.entityId);

    if (!entity || !(DataPsmSchema.is(entity) || DataPsmClass.is(entity))) {
      throw new Error(`Entity with id ${this.entityId} not found or is not a class or schema`);
    }

    const operation = new DataPsmSetJsonLdDefinedPrefixes();
    operation.dataPsmEntity = this.entityId;
    operation.jsonLdDefinedPrefixes = this.prefixes;
    this.store.applyOperation(schema, operation);
  }
}
