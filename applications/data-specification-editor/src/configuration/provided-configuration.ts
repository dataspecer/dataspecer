import { useAsyncMemo } from "@/editor/hooks/use-async-memo";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createDSEModelStore } from "@dataspecer/model-store/implementation";
import { getDataSpecificationWithModels, type DataSpecification } from "@dataspecer/specification/specification";
import { ClientConfigurator, DefaultClientConfiguration } from "../configuration";
import { OperationContext } from "../editor/operations/context/operation-context";
import { Configuration } from "./configuration";

/**
 * Based on the package iri and schema iri provides the full configuration which
 * includes everything needed to work with the specification.
 */
export async function getConfiguration(dataSpecificationIri: string | null, dataPsmSchemaIri: string | null): Promise<Configuration> {
  if (!dataSpecificationIri) {
    throw new Error("Data specification IRI is required.");
  }

  const modelStore = createDSEModelStore({
    projectId: dataSpecificationIri,
    backendUrl: import.meta.env.VITE_BACKEND,
    httpFetch,
  });

  await modelStore.initialize();
  await modelStore.waitForModelsToLoad();

  // Autosave: persist changed models to the backend after every fully
  // executed operation (commit, undo, redo).
  modelStore.subscribeToTransactionCommit(() => {
    modelStore.saveByOverride().catch(error => console.error("Failed to save models.", error));
  });

  window["modelStore"] = modelStore; // For debugging purposes

  const models = modelStore.getAllEntities();

  const dataSpecification = getDataSpecificationWithModels(
    dataSpecificationIri,
    models,
    changeListener => {
      return modelStore.subscribeToEntityChanges(changes => {
        changeListener(changes.entityChanges);
      });
    },
    modelStore.addOperationForTransaction.bind(modelStore),
    modelStore.commitTransaction.bind(modelStore),
  );

  window["dataSpecification"] = dataSpecification; // For debugging purposes

  const operationContext = getOperationContext(dataSpecification.dataSpecifications[dataSpecificationIri]);

  return {
    ...dataSpecification,
    dataSpecificationIri,
    dataPsmSchemaIri,
    operationContext,
    models,
    modelStore,
  };
}

export function getOperationContext(dataSpecification: DataSpecification): OperationContext {
  const configurationForContext = ClientConfigurator.merge(
    DefaultClientConfiguration,
    ClientConfigurator.getFromObject(dataSpecification.userPreferences)
  );
  const operationContext = new OperationContext();
  operationContext.labelRules = {
    languages: [configurationForContext.technicalLabelLanguages],
    namingConvention: configurationForContext.technicalLabelCasingConvention,
    specialCharacters: configurationForContext.technicalLabelSpecialCharacters,
  };

  return operationContext;
}

/**
 * Loads the configuration from the given IRIs and registers the stores properly
 * to be updated when modification occurs. This hook requires loaders that
 * decide how to load the configuration from the given IRIs.
 * @param dataSpecificationIri IRI of the whole specification
 * @param dataPsmSchemaIri IRI of the given PSM schema that will be updated
 */
export const useProvidedConfiguration = (dataSpecificationIri: string | null, dataPsmSchemaIri: string | null): Configuration | null => {
  const [configuration] = useAsyncMemo(() => getConfiguration(dataSpecificationIri, dataPsmSchemaIri), [dataSpecificationIri, dataPsmSchemaIri]);

  window["configuration"] = configuration; // For debugging purposes

  return configuration;
};
