import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { LOCAL_SEMANTIC_MODEL } from "../model/known-models.ts";

export function getSemanticModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId];
  if (!mainEntity || !mainEntity.type?.includes(LOCAL_SEMANTIC_MODEL)) {
    return null;
  }
  const alias = (mainEntity as { modelAlias?: string }).modelAlias;
  return {
    label: alias ? { en: alias } : {},
    description: {},
  };
}
