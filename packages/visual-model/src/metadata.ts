import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { VISUAL_MODEL_ENTITY_TYPE, type ModelEntity } from "./default-visual-model.ts";

export function getVisualModelMetadata(entities: EntityRecord, _modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = Object.values(entities).find(entity => entity.type?.includes(VISUAL_MODEL_ENTITY_TYPE));
  if (!mainEntity) {
    return null;
  }
  return {
    label: (mainEntity as ModelEntity).label ?? {},
    description: {},
  };
}
