import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { ModelEntityType, type ModelEntity } from "./default-visual-model.ts";

export function getVisualModelMetadata(entities: EntityRecord, _modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = Object.values(entities).find(entity => entity.type?.includes(ModelEntityType));
  if (!mainEntity) {
    return null;
  }
  return {
    label: (mainEntity as ModelEntity).label ?? {},
    description: {},
  };
}
