import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { DataPsmSetJsonLdDefinedTypeMapping } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class SetJsonTypeMapping implements ComplexOperation {
  private readonly entityId: string;
  private readonly mapping: Record<string, string>;
  private store!: FederatedObservableStore;

  constructor(entityId: string, mapping: Record<string, string>) {
    this.entityId = entityId;
    this.mapping = mapping;
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

    const operation = new DataPsmSetJsonLdDefinedTypeMapping();
    operation.dataPsmEntity = this.entityId;
    operation.jsonLdDefinedTypeMapping = this.mapping;
    this.store.applyOperation(schema, operation);
  }
}
