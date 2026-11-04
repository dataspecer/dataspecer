import { euSource } from "./eu/eu-source"
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
    metadataDerivation: {
      en: "Continuing downloads the chosen JSON-LD distribution, reads the vocabulary IRI and the IRIs of its values from the file, and derives the IRI pattern from them. For other formats only the addresses are filled in, and the vocabulary IRI and the IRI pattern are left for you to fill in.",
      cs: "Po pokračování se stáhne vybraná distribuce ve formátu JSON-LD, ze souboru se přečte IRI slovníku a IRI jeho hodnot a z nich se odvodí vzor IRI. U ostatních formátů se vyplní pouze adresy, IRI slovníku a vzor IRI zůstanou k ručnímu vyplnění.",
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
      en: "The files of the distributions cannot be read from the browser, so only their addresses are taken from the chosen one. For a named authority list, the vocabulary IRI is derived from the identifier of the record (http://publications.europa.eu/resource/authority/<identifier>), and the IRI pattern from its values found with skos:inScheme. For the other types of vocabularies, the vocabulary IRI and the IRI pattern must be filled in by hand.",
      cs: "Soubory distribucí nelze číst z prohlížeče, proto se z vybrané distribuce přebírají pouze adresy. U pojmenovaného autoritního seznamu se IRI slovníku odvodí z identifikátoru záznamu (http://publications.europa.eu/resource/authority/<identifikátor>) a vzor IRI z jeho hodnot nalezených pomocí skos:inScheme. U ostatních typů slovníků je třeba IRI slovníku a vzor IRI vyplnit ručně.",
    },
  },
]

const sources: readonly VocabularySource[] = [nkodSource, euSource]

/**
 * Finds the source with the id, undefined for an unknown source or one that
 * is not available yet.
 */
export function getSource(id: string): VocabularySource | undefined {
  return sources.find((source) => source.id === id)
}
