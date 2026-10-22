import type { Store } from "n3";
import type { OfnVocabulary } from "./concepts.ts";
import { listVocabulariesSparqlQuery } from "./list-vocabularies.sparql.ts";
import { executeSparqlConstructQuery, type SparqlQueryOptions } from "./sparql.ts";

export interface ListOfnVocabulariesOptions extends SparqlQueryOptions {}

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const SKOS_PREF_LABEL = "http://www.w3.org/2004/02/skos/core#prefLabel";
const DCTERMS_DESCRIPTION = "http://purl.org/dc/terms/description";
const OFN_VOCABULARY = "https://slovník.gov.cz/generický/datový-slovník-ofn-slovníků/pojem/slovník";

/**
 * Lists all vocabularies available in the OFN vocabulary registry.
 *
 * Currently a SPARQL endpoint is supported only.
 */
export async function listOfnVocabularies(options: ListOfnVocabulariesOptions): Promise<OfnVocabulary[]> {
  const store = await executeSparqlConstructQuery(options, listVocabulariesSparqlQuery);
  const vocabularyIris = new Set(
    store
      .getQuads(null, RDF_TYPE, OFN_VOCABULARY, null)
      .filter((quad) => quad.subject.termType === "NamedNode")
      .map((quad) => quad.subject.value),
  );

  return [...vocabularyIris].sort().map((iri) => ({
    iri,
    label: languageMap(store, iri, SKOS_PREF_LABEL),
    description: languageMap(store, iri, DCTERMS_DESCRIPTION),
  }));
}

function languageMap(store: Store, subjectIri: string, predicateIri: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const quad of store.getQuads(subjectIri, predicateIri, null, null)) {
    if (quad.object.termType !== "Literal") continue;
    result[quad.object.language] ??= quad.object.value;
  }
  return result;
}
