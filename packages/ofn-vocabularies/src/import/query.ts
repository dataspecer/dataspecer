import { isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { listOfnVocabularies, type ListOfnVocabulariesOptions } from "./list.ts";
import { loadOfnVocabularyAsSemanticModelConcepts, type LoadOfnVocabularyConceptsOptions } from "./load-vocabulary-concepts.ts";

const endpoint = "https://data.gov.cz/slovníky/sparql";
const vocabularyIri = process.argv[2];

const options: ListOfnVocabulariesOptions = {
  sparqlEndpoint: endpoint,
  fetchImplementation: fetch,
};

if (vocabularyIri) {
  const concepts = await loadOfnVocabularyAsSemanticModelConcepts({
    sparqlEndpoint: endpoint,
    fetchImplementation: fetch,
    vocabularyIri,
  } satisfies LoadOfnVocabularyConceptsOptions);
  console.table(
    Object.values(concepts)
      .filter(isSemanticModelClass)
      .map((v) => ({ iri: v.iri, label: v.name?.cs })),
  );
} else {
  const vocabularies = await listOfnVocabularies(options);
  console.table(vocabularies.map((v) => ({ iri: v.iri, label: v.label?.cs })));
}
