import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";
import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";

export class SetClassCodelist implements ComplexOperation {
    private readonly forPimClassIri: string;
    private readonly codelist: string[];
    private readonly isCodelist: boolean;
    private store!: FederatedObservableStore;

    /**
     * @param forPimClassIri
     * @param isCodelist
     * @param codelist
     */
    constructor(forPimClassIri: string, isCodelist: boolean, codelist: string[]) {
        this.forPimClassIri = forPimClassIri;
        this.codelist = codelist;
        this.isCodelist = isCodelist;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    execute(): void {
        const schema = this.store.getSchemaForResource(this.forPimClassIri) as string;

        const operation = modifyClass(this.forPimClassIri, {
            // @ts-ignore
            codelist: this.codelist,
            isCodelist: this.isCodelist
        });

        // @ts-ignore
        this.store.applyOperation(schema, operation);
    }
}
