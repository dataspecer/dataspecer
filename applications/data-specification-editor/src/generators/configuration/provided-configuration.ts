import { DataSpecification, StructureEditorBackendService } from "@dataspecer/backend-utils/connectors/specification";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createDSEModelStore } from "@dataspecer/model-store/implementation";
import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import { ClientConfigurator, DefaultClientConfiguration } from "../../configuration";
import { OperationContext } from "../../editor/operations/context/operation-context";
import { Configuration } from "./configuration";
import { FrontendModelRepository } from "@/manager/utils/model-repository";

export const backendPackageService = new StructureEditorBackendService(import.meta.env.VITE_BACKEND as string, httpFetch, "http://dataspecer.com/packages/local-root");
export const modelRepository = new FrontendModelRepository(backendPackageService);

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
    packageService: backendPackageService,
    httpFetch,
  });

  await modelStore.initialize();
  await modelStore.waitForModelsToLoad();

  window["modelStore"] = modelStore; // For debugging purposes



  const dataSpecification = getDataSpecificationWithModels(
    dataSpecificationIri,
    modelStore.getAllEntities(),
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
