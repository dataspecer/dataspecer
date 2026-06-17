import type { StructureEditorBackendService } from "@dataspecer/backend-utils";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createDSEModelStore } from "@dataspecer/model-store/implementation";
import { getDataSpecificationWithModels, type DataSpecification } from "@dataspecer/specification/specification";
import { ClientConfigurator, DefaultClientConfiguration } from "../configuration";
import { OperationContext } from "../editor/operations/context/operation-context";
import { Configuration } from "./configuration";
import { useAsyncMemo } from "@/editor/hooks/use-async-memo";
import { useContext, useEffect } from "react";
import { BackendConnectorContext } from "@/application";

/**
 * Based on the package iri and schema iri provides the full configuration which
 * includes everything needed to work with the specification.
 */
export async function getConfiguration(dataSpecificationIri: string | null, dataPsmSchemaIri: string | null, backendService: StructureEditorBackendService): Promise<Configuration> {
  if (!dataSpecificationIri) {
    throw new Error("Data specification IRI is required.");
  }

  const modelStore = createDSEModelStore({
    projectId: dataSpecificationIri,
    packageService: backendService,
    httpFetch,
  });

  await modelStore.initialize();
  await modelStore.waitForModelsToLoad();

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
    // @ts-ignore
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
  const backendConnector = useContext(BackendConnectorContext);

  const [configuration] = useAsyncMemo(() => getConfiguration(dataSpecificationIri, dataPsmSchemaIri, backendConnector), [dataSpecificationIri, dataPsmSchemaIri, backendConnector]);

  window["configuration"] = configuration; // For debugging purposes

  useEffect(() => {
    // @ts-ignore
    const modelStore = (configuration as any)?.modelStore;

    if (!modelStore) return;

    // WIP
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      // Undo: Ctrl/Cmd+Z (without Shift)
      if (mod && !e.shiftKey && key === "z") {
        e.preventDefault();
        if (typeof modelStore.undo === "function") modelStore.undo();
        return;
      }
      // Redo: Ctrl/Cmd+Shift+Z or Ctrl+Y
      if (mod && ((e.shiftKey && key === "z") || key === "y")) {
        e.preventDefault();
        if (typeof modelStore.redo === "function") modelStore.redo();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [configuration]);
  return configuration;
};
