/**
 * The Reference Data Catalogue of EU Vocabularies, as published on data.europa.eu.
 */
export const EU_CATALOGUE_IRI = "http://data.europa.eu/88u/catalogue/publ"

export const DATASET_TYPE_IRI = "http://publications.europa.eu/resource/authority/dataset-type/"

/**
 * Types of the datasets of the catalogue that are vocabularies with values:
 * named authority lists, code lists, taxonomies and thesauri. The other
 * datasets, such as application profiles or environmental data, are left out.
 */
export const VOCABULARY_TYPES = ["NAL", "CODE_LIST", "TAXONOMY", "THESAURUS"] as const

/**
 * The type of a dataset that is a named authority list, whose values have IRIs derived from the IRI of the list.
 */
export const NAMED_AUTHORITY_LIST = "NAL"

export const PREFIXES = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>`

/**
 * The language tags of the titles shown in the listing: English and Czech, which are the languages of the
 * application. The Czech titles are mostly machine translations of the English ones, which the catalog tags
 * "cs-t-en-t0-mtec". The titles in the other 22 languages are left out, since they would
 * make the answer ten times bigger. The form gets all the titles from the record of the vocabulary.
 */
const LISTED_TITLE_LANGUAGES = `"en", "cs", "cs-t-en-t0-mtec"`

/**
 * Binds ?dataset to every vocabulary of the catalogue, ?type to its type and ?group to the body
 * the vocabulary is grouped under. That is its creator, or its publisher when
 * it has no creator, which is the case of a quarter of the vocabularies.
 */
const VOCABULARY_DATASETS = `<${EU_CATALOGUE_IRI}> dcat:dataset ?dataset .
    ?dataset a dcat:Dataset ;
             dct:type ?type ;
             dct:publisher ?publisher .
    VALUES ?type { ${VOCABULARY_TYPES.map((type) => `<${DATASET_TYPE_IRI}${type}>`).join(" ")} }
    OPTIONAL { ?dataset dct:creator ?creator FILTER(isIRI(?creator)) }
    BIND(COALESCE(?creator, ?publisher) AS ?group)`

/**
 * Reads all the vocabularies of the catalogue, with their group and titles: a row for each title.
 *
 * The rows are in the form {@link createCatalogueLoader} takes.
 */
export function catalogueQuery(): string {
  return `${PREFIXES}
SELECT DISTINCT ?dataset ?group ?title
WHERE {
  ${VOCABULARY_DATASETS}
  OPTIONAL { ?dataset dct:title ?title FILTER(LANG(?title) IN (${LISTED_TITLE_LANGUAGES})) }
}`
}

/**
 * Reads the names of the groups of the vocabularies in all languages: a row for each name.
 */
export function groupNamesQuery(): string {
  return `${PREFIXES}
SELECT DISTINCT ?group ?name
WHERE {
  {
    SELECT DISTINCT ?group
    WHERE {
      ${VOCABULARY_DATASETS}
    }
  }
  OPTIONAL { ?group skos:prefLabel ?name }
}`
}
