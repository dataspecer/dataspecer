import { DataPsmCreateAttribute, DataPsmSetCardinality } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class CreateNonInterpretedAttribute implements ComplexOperation {
  private readonly ownerClass: string;
  private store!: FederatedObservableStore;

  constructor(ownerClass: string) {
    this.ownerClass = ownerClass;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.ownerClass) as string;

    const operation = new DataPsmCreateAttribute();

    operation.dataPsmInterpretation = null;
    operation.dataPsmTechnicalLabel = "attribute";
    operation.dataPsmDatatype = "http://www.w3.org/2001/XMLSchema#string";
    operation.dataPsmOwner = this.ownerClass;

    const result = this.store.applyOperation(schema, operation);
    const attributeId = result.created[0];

    const cardinality = new DataPsmSetCardinality();
    cardinality.dataPsmCardinality = [1, 1];
    cardinality.entityId = attributeId;
    this.store.applyOperation(schema, cardinality);
  }
}
