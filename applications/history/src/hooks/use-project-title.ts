import { useModelStore } from "@/contexts/model-store-context";
import { ProjectModelEntity } from "@dataspecer/project-model";

function pickLabel(label: Record<string, string>): string | undefined {
  return label["en"] ?? label["cs"] ?? Object.values(label)[0];
}

export function useProjectTitle(packageIri: string | undefined): string | undefined {
  const { modelStore } = useModelStore();
  if (!modelStore || !packageIri) return undefined;

  const modelEntity = modelStore.getAllEntities()[modelStore.projectModelId][packageIri] as ProjectModelEntity;

  return pickLabel(modelEntity.label);
}
