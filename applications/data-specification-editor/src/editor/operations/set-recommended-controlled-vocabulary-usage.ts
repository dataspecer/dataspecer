import {DataPsmSetRecommendedControlledVocabularyUsage} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Sets how the controlled vocabulary assigned with the usage "recommended" is
 * validated. Null means that the default of the data specification is used.
 */
export class SetRecommendedControlledVocabularyUsage implements ComplexOperation {
  private readonly forDataPsmClass: string;
  private readonly requireValue: boolean | null;
  private readonly restrictValues: boolean | null;
  private store!: FederatedObservableStore;

  constructor(forDataPsmClass: string, requireValue: boolean | null, restrictValues: boolean | null) {
    this.forDataPsmClass = forDataPsmClass;
    this.requireValue = requireValue;
    this.restrictValues = restrictValues;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.forDataPsmClass) as string;

    const operation = new DataPsmSetRecommendedControlledVocabularyUsage();
    operation.entityId = this.forDataPsmClass;
    operation.requireRecommendedControlledVocabularyValue = this.requireValue;
    operation.restrictToRecommendedControlledVocabulary = this.restrictValues;
    this.store.applyOperation(schema, operation);
  }
}
