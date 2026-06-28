import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { DataPsmCreateClass, DataPsmCreateInclude, DataPsmSetChoice, DataPsmWrapWithOr } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { TechnicalLabelOperationContext } from "./context/technical-label-operation-context";

/**
 * Operation that modifies the PSM tree in such way that the provided PIM class
 * specializes existing PSM class. If the class is already part of OR, the new
 * class is only added as another choice. Otherwise, new OR is created.
 *
 * todo: wrappedOrIri needs to be provided
 */
export class AddSpecialization implements ComplexOperation {
  private readonly forDataPsmClassId: string;
  private readonly wrappedOrId?: string;
  private readonly semanticClassId: string;

  private store!: FederatedObservableStore;
  private context: TechnicalLabelOperationContext | null = null;
  private semanticStore!: SemanticModelAggregator;

  constructor(forDataPsmClassId: string, wrappedOrId: string | undefined, semanticClassId: string) {
    this.forDataPsmClassId = forDataPsmClassId;
    this.wrappedOrId = wrappedOrId;
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
    const targetSemanticClass = this.semanticStore.getLocalEntity(this.semanticClassId).aggregatedEntity as SemanticModelClass;
    const dataPsmSchema = this.store.getSchemaForResource(this.forDataPsmClassId) as string;

    // FIRST: Get wrapping *OR* or create it

    let wrapOr: string | undefined = this.wrappedOrId;
    if (wrapOr === undefined) {
      const wrapWithOrOperation = new DataPsmWrapWithOr();
      wrapWithOrOperation.dataPsmChild = this.forDataPsmClassId;
      this.store.applyOperation(dataPsmSchema, wrapWithOrOperation);
      wrapOr = wrapWithOrOperation.dataPsmNewIri as string;
    }

    // THIRD: Add PSM class

    const dataPsmCreateClass = new DataPsmCreateClass();
    dataPsmCreateClass.dataPsmInterpretation = targetSemanticClass.id;
    dataPsmCreateClass.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(targetSemanticClass.name) ?? null;
    this.store.applyOperation(dataPsmSchema, dataPsmCreateClass);
    const createdPsmClass = dataPsmCreateClass.dataPsmNewIri as string;

    // FOURTH: Add to OR

    const addToOr = new DataPsmSetChoice();
    addToOr.dataPsmOr = wrapOr;
    addToOr.dataPsmChoice = createdPsmClass;
    this.store.applyOperation(dataPsmSchema, addToOr);

    // FIFTH: Add include

    const addInclude = new DataPsmCreateInclude();
    addInclude.dataPsmOwner = createdPsmClass;
    addInclude.dataPsmIncludes = this.forDataPsmClassId;
    this.store.applyOperation(dataPsmSchema, addInclude);
  }
}
