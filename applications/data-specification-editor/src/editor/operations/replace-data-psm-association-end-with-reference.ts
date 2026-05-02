import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {DataPsmCreateClassReference, DataPsmDeleteClass, DataPsmSetPart} from "@dataspecer/core/data-psm/operation";
import {DataPsmAssociationEnd, DataPsmSchema} from "@dataspecer/core/data-psm/model";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";
import { CoreResource } from "@dataspecer/core/core/core-resource";

export class ReplaceDataPsmAssociationEndWithReference implements ComplexOperation {
    private readonly dataPsmAssociationEnd: string;
    private readonly referencedDataPsmSchema: string;
    private store!: FederatedObservableStore;

    constructor(dataPsmAssociationEnd: string, referencedDataPsmSchema: string) {
        this.dataPsmAssociationEnd = dataPsmAssociationEnd;
        this.referencedDataPsmSchema = referencedDataPsmSchema;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    execute(): void {
        const schema = this.store.readResource(this.referencedDataPsmSchema) as CoreResource | null;
        const associationEnd = this.store.readResource(this.dataPsmAssociationEnd) as CoreResource | null;

        if (!schema || !DataPsmSchema.is(schema)) {
            throw new Error(`Schema '${this.referencedDataPsmSchema}' is not a schema.`);
        }

        if (!associationEnd || !DataPsmAssociationEnd.is(associationEnd)) {
            throw new Error(`Association end '${this.dataPsmAssociationEnd}' is not an association end.`);
        }

        const replacingClass = schema.dataPsmRoots[0];
        const dataPsmSchema = this.store.getSchemaForResource(this.dataPsmAssociationEnd) as string;
        const oldClass = associationEnd.dataPsmPart;

        // Create a reference to the class

        const dataPsmCreateClassReference = new DataPsmCreateClassReference();
        dataPsmCreateClassReference.dataPsmClass = replacingClass;
        dataPsmCreateClassReference.dataPsmSpecification = schema.iri;
        const dataPsmCreateClassReferenceResult = this.store.applyOperation(dataPsmSchema, dataPsmCreateClassReference);
        const reference = dataPsmCreateClassReferenceResult.created[0];

        // Replace the association end with the reference

        const dataPsmSetPart = new DataPsmSetPart();
        dataPsmSetPart.dataPsmAssociationEnd = this.dataPsmAssociationEnd;
        dataPsmSetPart.dataPsmPart = reference;
        this.store.applyOperation(dataPsmSchema, dataPsmSetPart);

        // Remove the old class

        if (oldClass) {
            const oldClassSchema = this.store.getSchemaForResource(oldClass) as string;

            const dataPsmDeleteClass = new DataPsmDeleteClass();
            dataPsmDeleteClass.dataPsmClass = oldClass;
            this.store.applyOperation(oldClassSchema, dataPsmDeleteClass);
        }
    }
}
