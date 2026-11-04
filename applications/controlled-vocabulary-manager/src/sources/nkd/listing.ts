/**
 * Datasets of NKD declare the standard they conform to with dct:conformsTo.
 * The codelists are the datasets conforming to the open formal norm (OFN) for codelists,
 * in any of its versions, which all start with this IRI.
 */
const OFN_CODELISTS_IRI = "https://ofn.gov.cz/číselníky"

export const PREFIXES = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>`

/**
 * Binds ?dataset to every codelist (a dcat:Dataset conforming to the norm) and ?group to its publisher.
 * The series of codelist versions are left out: they have no distributions
 * of their own, and their versions are listed as codelists themselves.
 */
const CODELIST_DATASETS = `?dataset a dcat:Dataset ;
            dct:conformsTo ?standard ;
            dct:publisher ?group .
    FILTER(STRSTARTS(STR(?standard), "${OFN_CODELISTS_IRI}"))
    FILTER NOT EXISTS { ?dataset a dcat:DatasetSeries }`

/**
 * Reads all the codelists with their publisher and titles: a row for each title.
 * The rows are in the form {@link createCatalogueListing} takes.
 */
export function catalogueQuery(): string {
  return `${PREFIXES}
SELECT DISTINCT ?dataset ?group ?title
WHERE {
  ${CODELIST_DATASETS}
  OPTIONAL { ?dataset dct:title ?title }
}`
}

/**
 * Reads the names of the publishers of the codelists: a row for each name.
 * The publisher names are asked for with one pattern: a pattern per language makes the endpoint
 * reject the query as too expensive for a publisher with many codelists.
 */
export function groupNamesQuery(): string {
  return `${PREFIXES}
SELECT DISTINCT ?group ?name
WHERE {
  {
    SELECT DISTINCT ?group
    WHERE {
      ${CODELIST_DATASETS}
    }
  }
  OPTIONAL { ?group foaf:name ?name }
}`
}
