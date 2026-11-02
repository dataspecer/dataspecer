import { nkodSource } from "./nkod/nkod-source"
import type { SourceDescriptor, VocabularySource } from "./types"

/**
 * The sources offered in the "Add from source" flow, in the order they are
 * listed.
 */
export const sourceDescriptors: readonly SourceDescriptor[] = [
  {
    id: "nkod",
    name: {
      en: "Czech National Open Data Catalog (NKOD)",
      cs: "Národní katalog otevřených dat (NKOD)",
    },
    url: "https://data.gov.cz/datasets",
    available: true,
  },
  {
    id: "eu-vocabularies",
    name: {
      en: "EU Vocabularies",
      cs: "Slovníky EU",
    },
    url: "https://op.europa.eu/en/web/eu-vocabularies",
    available: false,
  },
]

const sources: readonly VocabularySource[] = [nkodSource]

/**
 * Finds the source with the id, undefined for an unknown source or one that
 * is not available yet.
 */
export function getSource(id: string): VocabularySource | undefined {
  return sources.find((source) => source.id === id)
}
