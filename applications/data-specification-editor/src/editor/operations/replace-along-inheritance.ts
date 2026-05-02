import { SemanticModelClass } from '@dataspecer/core-v2/semantic-model/concepts';
import { DataPsmClass } from "@dataspecer/core/data-psm/model";
import { DataPsmCreateClass, DataPsmDeleteClass, DataPsmReplaceAlongInheritance } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { SemanticModelAggregator } from '@dataspecer/core-v2/hierarchical-semantic-aggregator';
import { TechnicalLabelOperationContext } from "./context/technical-label-operation-context";

/**
 * Replaces an existing DataPSM class with a new one that interprets given CIM
 * iri. The replaced class needs to be a subclass or superclass of the class to
 * be replaced.
 */
export class ReplaceAlongInheritance implements ComplexOperation {
  private readonly fromDataPsmClassId: string;
  private readonly toSemanticClassId: string;
  private store!: FederatedObservableStore;
  private context: TechnicalLabelOperationContext | null = null;
  private semanticStore!: SemanticModelAggregator;

  /**
   * @param fromDataPsmClassId Class IRI from the local store that is to be replaced and removed.
   * @param toSemanticClassId Class IRI from the {@link sourceSemanticModel} that is to be used as replacement.
   * @param sourceSemanticModel The PIM model that contains the replacement class and full inheritance hierarchy.
   */
  constructor(fromDataPsmClassId: string, toSemanticClassId: string) {
    this.fromDataPsmClassId = fromDataPsmClassId;
    this.toSemanticClassId = toSemanticClassId;
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
    const fromDataPsmClass = this.store.readResource(this.fromDataPsmClassId) as DataPsmClass;
    const dataPsmSchemaIri = this.store.getSchemaForResource(fromDataPsmClass.iri as string) as string;
    const newSemanticClass = this.semanticStore.getLocalEntity(this.toSemanticClassId).aggregatedEntity as SemanticModelClass;

    // Create data PSM class

    const dataPsmCreateClass = new DataPsmCreateClass();
    dataPsmCreateClass.dataPsmInterpretation = newSemanticClass.id;
    dataPsmCreateClass.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(newSemanticClass.name) ?? null;
    const dataPsmCreateClassResult = this.store.applyOperation(dataPsmSchemaIri, dataPsmCreateClass);
    const toPsmClassIri = dataPsmCreateClassResult.created[0];

    // Replace data psm classes

    const dataPsmReplaceAlongInheritance = new DataPsmReplaceAlongInheritance();
    dataPsmReplaceAlongInheritance.dataPsmOriginalClass = fromDataPsmClass.iri;
    dataPsmReplaceAlongInheritance.dataPsmReplacingClass = toPsmClassIri;
    this.store.applyOperation(dataPsmSchemaIri, dataPsmReplaceAlongInheritance);

    // Remove the old class

    const dataPsmDeleteClass = new DataPsmDeleteClass();
    dataPsmDeleteClass.dataPsmClass = fromDataPsmClass.iri;
    this.store.applyOperation(dataPsmSchemaIri, dataPsmDeleteClass);
  }
}
