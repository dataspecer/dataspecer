/**
 * Represents a vocabulary according to https://ofn.gov.cz/slovníky/
 */
export interface OfnVocabulary {
  iri: string;
  label: Record<string, string>;
  description: Record<string, string>;
}
