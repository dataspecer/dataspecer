import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { CONTROLLED_VOCABULARY_TYPE, type ControlledVocabulary } from "./concepts/controlled-vocabulary.ts";

export function getControlledVocabularyModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId] as ControlledVocabulary | undefined;
  if (!mainEntity || !mainEntity.type?.includes(CONTROLLED_VOCABULARY_TYPE)) {
    return null;
  }
  return {
    label: mainEntity.title ? { en: mainEntity.title } : {},
    description: {},
  };
}
