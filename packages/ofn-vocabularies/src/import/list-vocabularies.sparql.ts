export const listVocabulariesSparqlQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX ofn: <https://slovník.gov.cz/generický/datový-slovník-ofn-slovníků/pojem/>

CONSTRUCT {
  ?v rdf:type ofn:slovník .
  ?v skos:prefLabel ?label .
  ?v dcterms:description ?description .
} WHERE {
  ?v rdf:type ofn:slovník .
  OPTIONAL { ?v skos:prefLabel ?label }
  OPTIONAL { ?v dcterms:description ?description }
}`;
