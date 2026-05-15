import { SemanticModelClass } from '@dataspecer/core-v2/semantic-model/concepts';
import { LanguageString } from "@dataspecer/core/core";
import { DataPsmCreateClass, DataPsmSetHumanDescription, DataPsmSetHumanLabel, DataPsmSetRoots } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { SemanticModelAggregator } from '@dataspecer/core-v2/hierarchical-semantic-aggregator';
import { TechnicalLabelOperationContext } from "./context/technical-label-operation-context";

/**
 * For the given pimClass, it creates a new schema and new PIM and DataPSM classes representing the given class.
 *
 * It is expected that the store already contains a schema.
 *
 * Schema roots are overwritten, but the class tree is not removed. This operation expects empty store having only a
 * schema.
 */
export class CreateRootClass implements ComplexOperation {
  private readonly semanticClassId: string | null;
  private readonly dataPsmSchemaIri: string;
  private readonly schemaHumanLabel?: LanguageString;
  private readonly schemaHumanDescription?: LanguageString;
  private store!: FederatedObservableStore;
  private context: TechnicalLabelOperationContext | null = null;
  private semanticStore!: SemanticModelAggregator;

  constructor(semanticClassId: string | null, dataPsmSchemaIri: string, schemaHumanLabel?: LanguageString, schemaHumanDescription?: LanguageString) {
    this.semanticClassId = semanticClassId;
    this.dataPsmSchemaIri = dataPsmSchemaIri;
    this.schemaHumanLabel = schemaHumanLabel;
    this.schemaHumanDescription = schemaHumanDescription;
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
    const dataPsmCreateClass = new DataPsmCreateClass();

    const semanticClass = this.semanticClassId ? this.semanticStore.getLocalEntity(this.semanticClassId).aggregatedEntity as SemanticModelClass : null;
    if (semanticClass) {
      dataPsmCreateClass.dataPsmInterpretation = semanticClass.id;
      dataPsmCreateClass.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(semanticClass.name) ?? null;
    } else {
      dataPsmCreateClass.dataPsmTechnicalLabel = "root";
    }

    const dataPsmCreateClassResult = this.store.applyOperation(this.dataPsmSchemaIri, dataPsmCreateClass);

    const dataPsmUpdateSchemaRoots = new DataPsmSetRoots();
    dataPsmUpdateSchemaRoots.dataPsmRoots = [dataPsmCreateClassResult.created[0]];
    this.store.applyOperation(this.dataPsmSchemaIri, dataPsmUpdateSchemaRoots);

    // Schema label and description

    if (this.schemaHumanLabel) {
      const dataPsmSetHumanLabel = new DataPsmSetHumanLabel();
      dataPsmSetHumanLabel.dataPsmResource = this.dataPsmSchemaIri;
      dataPsmSetHumanLabel.dataPsmHumanLabel = this.schemaHumanLabel;
      this.store.applyOperation(this.dataPsmSchemaIri, dataPsmSetHumanLabel);
    }

    if (this.schemaHumanDescription) {
      const dataPsmSetHumanDescription = new DataPsmSetHumanDescription();
      dataPsmSetHumanDescription.dataPsmResource = this.dataPsmSchemaIri;
      dataPsmSetHumanDescription.dataPsmHumanDescription = this.schemaHumanDescription;
      this.store.applyOperation(this.dataPsmSchemaIri, dataPsmSetHumanDescription);
    }
  }
}
