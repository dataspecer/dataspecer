import type { Entity } from "@dataspecer/core/entity-model";

export const CONTROLLED_VOCABULARY_TYPE = "controlled-vocabulary" as const;

export interface ControlledVocabularyDistribution {
  downloadUrl: string;
  accessUrl: string;
}

export interface ControlledVocabulary extends Entity {
  type: [typeof CONTROLLED_VOCABULARY_TYPE];
  title: string;
  pattern: string;
  references: string;
  documentation: string;
  distribution: ControlledVocabularyDistribution;
}

export function isControlledVocabulary(entity: Entity): entity is ControlledVocabulary {
  return entity.type.includes(CONTROLLED_VOCABULARY_TYPE);
}
