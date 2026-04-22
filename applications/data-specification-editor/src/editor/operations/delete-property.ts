import {DataPsmAssociationEnd, DataPsmAttribute, DataPsmContainer, DataPsmInclude} from "@dataspecer/core/data-psm/model";
import {DataPsmDeleteAssociationEnd, DataPsmDeleteAttribute, DataPsmDeleteContainer, DataPsmDeleteInclude} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Deletes property from class parts.
 */
export class DeleteProperty implements ComplexOperation {
  private store!: FederatedObservableStore;
  private ownerClassIri: string;
  private propertyIri: string;

  constructor(ownerClassIri: string, propertyIri: string) {
    this.ownerClassIri = ownerClassIri;
    this.propertyIri = propertyIri;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.ownerClassIri) as string;
    const property = this.store.readResource(this.propertyIri);

    // Decide based on property type
    if (DataPsmAttribute.is(property)) {
      const operation = new DataPsmDeleteAttribute();
      operation.dataPsmAttribute = this.propertyIri;
      operation.dataPsmOwner = this.ownerClassIri;
      this.store.applyOperation(schema, operation);
    } else if (DataPsmAssociationEnd.is(property)) {
      const operation = new DataPsmDeleteAssociationEnd();
      operation.dataPsmAssociationEnd = this.propertyIri;
      operation.dataPsmOwner = this.ownerClassIri;
      this.store.applyOperation(schema, operation);
      // todo garbage collect associated object
    } else if (DataPsmInclude.is(property)) {
      const dataPsmDeleteInclude = new DataPsmDeleteInclude();
      dataPsmDeleteInclude.dataPsmInclude = this.propertyIri;
      dataPsmDeleteInclude.dataPsmOwner = this.ownerClassIri;
      this.store.applyOperation(schema, dataPsmDeleteInclude);
      // todo garbage collect associated object
    } else if (DataPsmContainer.is(property)) {
      const dataPsmDeleteContainer = new DataPsmDeleteContainer();
      dataPsmDeleteContainer.dataPsmContainer = this.propertyIri;
      dataPsmDeleteContainer.dataPsmOwner = this.ownerClassIri;
      this.store.applyOperation(schema, dataPsmDeleteContainer);
    } else {
      throw new Error("Unknown class property to delete.")
    }
  }
}
