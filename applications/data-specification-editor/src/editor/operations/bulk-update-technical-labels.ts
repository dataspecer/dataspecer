import {DataPsmSetTechnicalLabel} from "@dataspecer/core/data-psm/operation";
import {ComplexOperation} from "@dataspecer/federated-observable-store/complex-operation";
import {FederatedObservableStore} from "@dataspecer/federated-observable-store/federated-observable-store";
import {DataPsmClass} from "@dataspecer/core/data-psm/model/data-psm-class";
import {DataPsmAttribute} from "@dataspecer/core/data-psm/model/data-psm-attribute";
import {DataPsmAssociationEnd} from "@dataspecer/core/data-psm/model/data-psm-association-end";
import {DataPsmExternalRoot} from "@dataspecer/core/data-psm/model/data-psm-external-root";
import {DataPsmSchema} from "@dataspecer/core/data-psm/model/data-psm-schema";
import {TechnicalLabelOperationContext} from "./context/technical-label-operation-context";
import {applyCasingToLabel} from "./utils/casing-utils";
import {CASINGS} from "./context/operation-context";
import {PimClass} from "@dataspecer/core/pim/model/pim-class";
import {PimAttribute} from "@dataspecer/core/pim/model/pim-attribute";
import {PimAssociationEnd} from "@dataspecer/core/pim/model/pim-association-end";

export type BulkUpdateMode = "reset" | "apply-style";

/**
 * Complex operation that bulk updates technical labels in a data structure schema.
 * Supports two modes:
 * - "reset": Regenerates all labels from PIM resources, losing manual changes
 * - "apply-style": Keeps manual changes but applies the new casing convention
 */
export class BulkUpdateTechnicalLabels implements ComplexOperation {
    private readonly forDataPsmSchemaIri: string;
    private readonly mode: BulkUpdateMode;
    private readonly targetCasing: typeof CASINGS[number];
    private readonly context: TechnicalLabelOperationContext | null;
    private store!: FederatedObservableStore;

    constructor(
        forDataPsmSchemaIri: string,
        mode: BulkUpdateMode,
        targetCasing: typeof CASINGS[number],
        context: TechnicalLabelOperationContext | null = null
    ) {
        this.forDataPsmSchemaIri = forDataPsmSchemaIri;
        this.mode = mode;
        this.targetCasing = targetCasing;
        this.context = context;
    }

    setStore(store: FederatedObservableStore) {
        this.store = store;
    }

    async execute(): Promise<void> {
        const schema = await this.store.readResource(this.forDataPsmSchemaIri) as DataPsmSchema;
        
        if (!schema || !DataPsmSchema.is(schema)) {
            throw new Error(`Schema ${this.forDataPsmSchemaIri} not found or is not a DataPsmSchema`);
        }

        // Update the schema's technical label if it exists
        if (schema.dataPsmTechnicalLabel) {
            const newLabel = this.mode === "reset"
                ? (this.context ? this.context.getTechnicalLabelFromPim(schema.dataPsmHumanLabel ?? {}) : null)
                : applyCasingToLabel(schema.dataPsmTechnicalLabel, this.targetCasing);
            
            if (newLabel && newLabel !== schema.dataPsmTechnicalLabel) {
                await this.updateTechnicalLabel(this.forDataPsmSchemaIri, newLabel);
            }
        }

        // Update collection technical label if it exists
        if (schema.dataPsmCollectionTechnicalLabel) {
            const newLabel = this.mode === "apply-style"
                ? applyCasingToLabel(schema.dataPsmCollectionTechnicalLabel, this.targetCasing)
                : null; // Reset mode doesn't have a PIM source for collection labels
            
            if (newLabel && newLabel !== schema.dataPsmCollectionTechnicalLabel) {
                // Note: There's no specific operation for collection label, we'd need to update via schema operation
                // For now, we'll skip this as it would require additional implementation
            }
        }

        // Collect all resources in the schema
        const resourceIris = schema.dataPsmParts;

        // Process each resource
        for (const resourceIri of resourceIris) {
            const resource = await this.store.readResource(resourceIri);
            
            if (!resource) continue;

            // Only process resources that have technical labels
            if (DataPsmClass.is(resource) || DataPsmAttribute.is(resource) || 
                DataPsmAssociationEnd.is(resource) || DataPsmExternalRoot.is(resource)) {
                
                const currentLabel = resource.dataPsmTechnicalLabel;
                if (!currentLabel) continue;

                let newLabel: string | null = null;

                if (this.mode === "reset") {
                    // Regenerate from PIM
                    if ("dataPsmInterpretation" in resource && resource.dataPsmInterpretation) {
                        const pimResource = await this.store.readResource(resource.dataPsmInterpretation);
                        if (pimResource && "pimHumanLabel" in pimResource) {
                            if (PimClass.is(pimResource as any) || PimAttribute.is(pimResource as any) || PimAssociationEnd.is(pimResource as any)) {
                                const pimHumanLabel = (pimResource as any).pimHumanLabel;
                                newLabel = this.context ? this.context.getTechnicalLabelFromPim(pimHumanLabel ?? {}) : null;
                            }
                        }
                    }
                } else {
                    // Apply style to existing label
                    newLabel = applyCasingToLabel(currentLabel, this.targetCasing);
                }

                if (newLabel && newLabel !== currentLabel) {
                    await this.updateTechnicalLabel(resourceIri, newLabel);
                }
            }
        }
    }

    private async updateTechnicalLabel(resourceIri: string, newLabel: string): Promise<void> {
        const schemaIri = this.store.getSchemaForResource(resourceIri) as string;
        
        const operation = new DataPsmSetTechnicalLabel();
        operation.dataPsmResource = resourceIri;
        operation.dataPsmTechnicalLabel = newLabel;
        
        await this.store.applyOperation(schemaIri, operation);
    }
}
