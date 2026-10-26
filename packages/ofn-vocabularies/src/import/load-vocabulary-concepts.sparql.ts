const SKOS_NAMESPACE = "http://www.w3.org/2004/02/skos/core#";

export function loadVocabularyConceptsSparqlQuery(vocabularyIri: string, includeMetadata = false): string {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(vocabularyIri) || /[\u0000-\u0020<>"{}|^`\\]/u.test(vocabularyIri)) {
    throw new Error(`Invalid vocabulary IRI: ${vocabularyIri}`);
  }

  return `PREFIX skos: <${SKOS_NAMESPACE}>

CONSTRUCT {
  ?concept ?predicate ?object .
  ${includeMetadata ? `<${vocabularyIri}> ?metadataPredicate ?metadataObject .` : ""}
} WHERE {
  {
    ?concept skos:inScheme <${vocabularyIri}> .
    ?concept ?predicate ?object .
  }
  ${includeMetadata ? `UNION { <${vocabularyIri}> ?metadataPredicate ?metadataObject . }` : ""}
}`;
}
