import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { isMainSemanticModelEntity } from "./concepts/index.ts";

export function getSemanticModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId];
  if (!mainEntity || !isMainSemanticModelEntity(mainEntity)) {
    return null;
  }
  return {
    label: mainEntity.label ?? {},
    description: {},
  };
}
