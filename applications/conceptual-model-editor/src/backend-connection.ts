import { useMemo } from "react";

import { type EntityModel } from "@dataspecer/core-v2/entity-model";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import type { VisualModel } from "@dataspecer/visual-model";
import { createLayoutConfiguration } from "@dataspecer/layout";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";

export const useBackendConnection = () => {
  // Should fail already when spinning up the next app
  const service = useMemo(() => new BackendPackageService(import.meta.env.VITE_PUBLIC_APP_BACKEND!, httpFetch), []);

  const getModelsFromBackend = async (packageId: string) => {
    return service.constructSemanticModelPackageModels(packageId);
  };

  const getLayoutConfigurationModelFromBackend = async (packageIdentifier: string) => {
    const configurationData = (await service.getResourceJsonData(packageIdentifier)) ?? {};
    const configuration = createDefaultConfigurationModelFromJsonObject(configurationData);
    const layoutConfiguration = createLayoutConfiguration(configuration);
    return layoutConfiguration;
  };

  const updateSemanticModelPackageModels = async (
    packageId: string,
    models: EntityModel[],
    visualModels: VisualModel[]
  ) => {
    return service.updateSemanticModelPackageModels(packageId, models, visualModels);
  };

  return {
    updateSemanticModelPackageModels,
    getLayoutConfigurationModelFromBackend,
    getModelsFromBackend,
  };
};
