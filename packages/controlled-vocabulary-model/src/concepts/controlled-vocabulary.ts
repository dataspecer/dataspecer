import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";

export const CONTROLLED_VOCABULARY_TYPE = "controlled-vocabulary" as const;

/**
 * Interface representing metadata identified about a controlled vocabulary
 * - title = name of the controlled vocabulary (CV) per language tag
 * - pattern = regex pattern of the IRIs of CV values, null if not known
 * - references = main reference to the CV: the IRI of its skos:ConceptScheme
 *   when conformsToSkos is true, otherwise its download or documentation URL
 * - conformsToSkos = whether the CV values are skos:Concepts of the skos:ConceptScheme
 * - documentation = documentation URL, null if there is none
 * - distribution = reference to the CV distribution
 */
export interface ControlledVocabulary extends Entity {
  type: [typeof CONTROLLED_VOCABULARY_TYPE];
  title: LanguageString;
  pattern: string | null;
  references: string;
  conformsToSkos: boolean;
  documentation: string | null;
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
 * for most CVs downloadableUrl will match accessUrl, otherwise it is null
 */
export interface ControlledVocabularyDistribution {
  downloadUrl: string | null;
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
  title: {},
  pattern: null,
  references: "",
  conformsToSkos: true,
  documentation: null,
  distribution: {
    downloadUrl: null,
    accessUrl: "",
  },
  iri: null,
};
