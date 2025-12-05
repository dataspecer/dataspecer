import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import type { VisualModel } from "@dataspecer/visual-model";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { useMemo } from "react";

export type ExportedConfigurationType = {
    packageId: string;
    modelDescriptors: object[];
    timestamp: number;
    activeView?: string;
};

export const modelsToWorkspaceString = (
  models: Map<string, EntityModel>,
  visualModels: Map<string, VisualModel>,
  timestamp: number,
  activeView?: string
) => {
  const modelDescriptors: object[] = [];
  for (const [_, model] of models) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    modelDescriptors.push(model.serializeModel());
  }
  for (const [_, visualModel] of visualModels) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    modelDescriptors.push(visualModel.serializeModel());
  }

  const ws = {
    packageId: "",
    modelDescriptors: modelDescriptors,
    timestamp: timestamp,
    activeView,
  } satisfies ExportedConfigurationType;

  return JSON.stringify(ws);
};

export const useLocalStorage = () => {
  const WORKSPACE_STATE_KEY = "dscme-workspace-autosave-key";
  const service = useMemo(() => new BackendPackageService("fail-if-needed", httpFetch), []);

  const saveWorkspaceState = (
    models: Map<string, EntityModel>,
    visualModels: Map<string, VisualModel>,
    activeView?: string
  ) => {
    localStorage.setItem(
      WORKSPACE_STATE_KEY,
      modelsToWorkspaceString(models, visualModels, Date.now(), activeView)
    );
  };

  const getWorkspaceState = async () => {
    const ws = localStorage.getItem(WORKSPACE_STATE_KEY);
    if (!ws) {
      return;
    }

    const { packageId, modelDescriptors, activeView } = JSON.parse(ws) as ExportedConfigurationType;
    const [entityModels, visualModels] = await service.getModelsFromModelDescriptors(modelDescriptors);

    return { packageId, entityModels, visualModels, activeView };
  };

  return { saveWorkspaceState, getWorkspaceState };
};
