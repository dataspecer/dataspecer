import { euSource } from "./eu/eu-source"
import { nkdSource } from "./nkd/nkd-source"
import type { SourceDescriptor, VocabularySource } from "./types"

/**
 * The sources offered in the "Add from source" flow, in the order they are
 * listed.
 */
export const sourceDescriptors: readonly SourceDescriptor[] = [
  {
    id: "nkd",
    name: {
      en: "Czech National Data Catalog (NKD)",
      cs: "Národní katalog dat (NKD)",
    },
    url: "https://data.gov.cz/datasets",
    available: true,
    metadataDerivation: {
      en: "The vocabulary IRI and the IRIs of its values are read from the JSON-LD distribution of the vocabulary, and the IRI pattern is derived from them. When it has no JSON-LD distribution, only the addresses of its first distribution are filled in, and the vocabulary IRI and the IRI pattern must be filled in by hand.",
      cs: "IRI slovníku a IRI jeho hodnot se přečtou z distribuce slovníku ve formátu JSON-LD a z nich se odvodí vzor IRI. Pokud slovník distribuci v JSON-LD nemá, vyplní se pouze adresy jeho první distribuce a IRI slovníku a vzor IRI je třeba vyplnit ručně.",
    },
  },
  {
    id: "eu-vocabularies",
    name: {
      en: "EU Vocabularies",
      cs: "Slovníky EU",
    },
    url: "https://op.europa.eu/en/web/eu-vocabularies",
    available: true,
    metadataDerivation: {
      en: "For a named authority list, the vocabulary IRI is derived from the identifier of the record (http://publications.europa.eu/resource/authority/<identifier>), and the IRI pattern from the values of the list found with skos:inScheme. The addresses are taken from the RDF/XML distribution. For the other types of vocabularies, the vocabulary IRI and the IRI pattern must be filled in by hand.",
      cs: "U pojmenovaného autoritního seznamu se IRI slovníku odvodí z identifikátoru záznamu (http://publications.europa.eu/resource/authority/<identifikátor>) a vzor IRI z hodnot seznamu nalezených pomocí skos:inScheme. Adresy se přebírají z distribuce RDF/XML. U ostatních typů slovníků je třeba IRI slovníku a vzor IRI vyplnit ručně.",
    },
  },
]

const sources: readonly VocabularySource[] = [nkdSource, euSource]

/**
 * Finds the source with the id, undefined for an unknown source or one that
 * is not available yet.
 */
export function getSource(id: string): VocabularySource | undefined {
  return sources.find((source) => source.id === id)
}
