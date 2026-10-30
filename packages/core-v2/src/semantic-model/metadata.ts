import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { isMainSemanticModelEntity, type VocabularySource } from "./concepts/index.ts";

export interface SemanticModelMetadata extends ModelMetadata {
  source?: VocabularySource;
}

export function getSemanticModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): SemanticModelMetadata | null {
  const mainEntity = entities[modelId];
  if (!mainEntity || !isMainSemanticModelEntity(mainEntity)) {
    return null;
  }
  return {
    label: mainEntity.label ?? {},
    description: {},
    source: mainEntity.source,
  };
}
