import type { Entity } from "@dataspecer/core/entity-model";

export const CONTROLLED_VOCABULARY_TYPE = "controlled-vocabulary" as const;

/**
 * Interface representing metadata identified about a controlled vocabulary
 * - title = name of the controlled vocabulary (CV)
 * - pattern = regex pattern of the IRIs of CV values
 * - references = IRI of the CV that the metadata references (IRI of skos:ConceptScheme)
 * - documentation = documentation URL
 * - distribution = reference to the CV distribution
 */
export interface ControlledVocabulary extends Entity {
  type: [typeof CONTROLLED_VOCABULARY_TYPE];
  title: string;
  pattern: string;
  references: string;
  documentation: string;
  distribution: ControlledVocabularyDistribution;

  /**
   * Stored/imported IRI of this CV's DCAT catalog dataset record, or null
   * to generate one deterministically on DSV export.
   */
  iri: string | null;
}

/**
 * Represents the CV distribution - point of access to the CV raw data
 * Based on DCAT specification - accessUrl is a required parameter
 * (distribution can be not downloadable - like endpoint)
 * for most CVs downloadableUrl will match accessUrl
 */
export interface ControlledVocabularyDistribution {
  downloadUrl: string;
  accessUrl: string;
}

export function isControlledVocabulary(entity: Entity): entity is ControlledVocabulary {
  return entity.type.includes(CONTROLLED_VOCABULARY_TYPE);
}

/**
 * Default field values used when creating a controlled vocabulary entity
 * with missing fields, or when a model has no stored data yet.
 */
export const DEFAULT_CONTROLLED_VOCABULARY: Omit<ControlledVocabulary, "id"> = {
  type: [CONTROLLED_VOCABULARY_TYPE],
  title: "",
  pattern: "",
  references: "",
  documentation: "",
  distribution: {
    downloadUrl: "",
    accessUrl: "",
  },
  iri: null,
};
