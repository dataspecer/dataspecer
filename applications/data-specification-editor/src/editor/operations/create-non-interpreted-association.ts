import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { DataPsmCreateAssociationEnd, DataPsmCreateClass } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { TechnicalLabelOperationContext } from "./context/technical-label-operation-context";
import { SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";

/**
 * Adds association to the same class. The association will not have any interpretation.
 */
export class CreateNonInterpretedAssociationToClass implements ComplexOperation {
  private readonly ownerClass: string;
  /**
   * If this is set, the association will be created to interpreted class
   */
  private readonly semanticClassId?: string;
  private store!: FederatedObservableStore;
  private context: TechnicalLabelOperationContext | null = null;
  private semanticStore!: SemanticModelAggregator;

  constructor(ownerClass: string, semanticClassId?: string) {
    this.ownerClass = ownerClass;
    this.semanticClassId = semanticClassId;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  setSemanticStore(semanticStore: SemanticModelAggregator) {
    this.semanticStore = semanticStore;
  }

  setContext(context: TechnicalLabelOperationContext) {
    this.context = context;
  }

  execute(): void {
    const schema = this.store.getSchemaForResource(this.ownerClass) as string;

    // Whether we have a semantic source or not
    const semanticClass = this.semanticClassId ? this.semanticStore.getLocalEntity(this.semanticClassId).aggregatedEntity as SemanticModelClass : null;

    const dataPsmCreateClass = new DataPsmCreateClass();

    if (semanticClass) {
      dataPsmCreateClass.dataPsmInterpretation = semanticClass.id;
      dataPsmCreateClass.dataPsmTechnicalLabel =
        this.context?.getTechnicalLabelFromPim(
          semanticClass.name
        ) ?? null;
    } else {
      dataPsmCreateClass.dataPsmInterpretation = null;
      dataPsmCreateClass.dataPsmTechnicalLabel = "class";
    }

    const dataPsmCreateClassResult = this.store.applyOperation(schema, dataPsmCreateClass);
    const psmClassIri = dataPsmCreateClassResult.created[0];

    const association = new DataPsmCreateAssociationEnd();
    association.dataPsmInterpretation = null;
    association.dataPsmTechnicalLabel = "association";
    association.dataPsmOwner = this.ownerClass;
    association.dataPsmPart = psmClassIri;
    this.store.applyOperation(schema, association);
  }
}
