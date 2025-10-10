import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { DataPsmCreateClassReference, DataPsmDeleteClass, DataPsmSetChoice, DataPsmSetPart, DataPsmUnsetChoice } from "@dataspecer/core/data-psm/operation";
import { DataPsmAssociationEnd, DataPsmOr, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { CoreResource } from "@dataspecer/core/core/core-resource";

/**
 * This operation replaces an existing structural class with a reference to an existing structural class.
 * The reference will be created, the old class will be deleted.
 *
 * This operation currently supports only OR as as source of the class.
 */
export class ReplaceStructuralClassWithReference implements ComplexOperation {
  private readonly structuralClassId: string;
  private readonly owningEntityId: string;
  private readonly referencedDataPsmSchema: string;
  private store!: FederatedObservableStore;

  constructor(structuralClassId: string, owningEntityId: string, referencedDataPsmSchema: string) {
    this.structuralClassId = structuralClassId;
    this.owningEntityId = owningEntityId;
    this.referencedDataPsmSchema = referencedDataPsmSchema;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  async execute(): Promise<void> {
    const schema = (await this.store.readResource(this.referencedDataPsmSchema)) as CoreResource | null;
    const owningEntity = (await this.store.readResource(this.owningEntityId)) as CoreResource | null;

    if (!schema || !DataPsmSchema.is(schema)) {
      throw new Error(`Schema '${this.referencedDataPsmSchema}' is not a schema.`);
    }

    if (!owningEntity || (!DataPsmOr.is(owningEntity) && !DataPsmAssociationEnd.is(owningEntity))) {
      throw new Error(`Owning entity '${this.structuralClassId}' is not of supported type.`);
    }

    const replacingClass = schema.dataPsmRoots[0];
    const dataPsmSchema = this.store.getSchemaForResource(this.structuralClassId) as string;
    let oldClass = this.structuralClassId;

    // Create a reference to the class

    const dataPsmCreateClassReference = new DataPsmCreateClassReference();
    dataPsmCreateClassReference.dataPsmClass = replacingClass;
    dataPsmCreateClassReference.dataPsmSpecification = schema.iri;
    const dataPsmCreateClassReferenceResult = await this.store.applyOperation(dataPsmSchema, dataPsmCreateClassReference);
    const reference = dataPsmCreateClassReferenceResult.created[0];

    // Replace it

    if (DataPsmOr.is(owningEntity)) {
      const remove = new DataPsmUnsetChoice();
      remove.dataPsmOr = this.owningEntityId;
      remove.dataPsmChoice = this.structuralClassId;
      await this.store.applyOperation(dataPsmSchema, remove);

      const add = new DataPsmSetChoice();
      add.dataPsmOr = this.owningEntityId;
      add.dataPsmChoice = reference;
      await this.store.applyOperation(dataPsmSchema, add);
    } else if (DataPsmAssociationEnd.is(owningEntity)) {
      const dataPsmSetPart = new DataPsmSetPart();
      dataPsmSetPart.dataPsmAssociationEnd = this.structuralClassId;
      dataPsmSetPart.dataPsmPart = reference;
      await this.store.applyOperation(dataPsmSchema, dataPsmSetPart);
    }

    // Remove the old class

    if (oldClass) {
      const oldClassSchema = this.store.getSchemaForResource(oldClass) as string;

      const dataPsmDeleteClass = new DataPsmDeleteClass();
      dataPsmDeleteClass.dataPsmClass = oldClass;
      await this.store.applyOperation(oldClassSchema, dataPsmDeleteClass);
    }
  }
}
