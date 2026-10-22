import type { Store } from "n3";
import { loadVocabularyConceptsSparqlQuery } from "./load-vocabulary-concepts.sparql.ts";
import { executeSparqlConstructQuery, type SparqlQueryOptions } from "./sparql.ts";
import type { Entities } from "@dataspecer/core-v2";
import { createRdfsSemanticModelAdapter } from "@dataspecer/core-v2/semantic-model/rdfs";

export interface LoadOfnVocabularyConceptsOptions extends SparqlQueryOptions {
  vocabularyIri: string;
}

export async function loadOfnVocabularyConcepts(options: LoadOfnVocabularyConceptsOptions): Promise<Store> {
  return executeSparqlConstructQuery(options, loadVocabularyConceptsSparqlQuery(options.vocabularyIri));
}

export async function loadOfnVocabularyAsSemanticModelConcepts(options: LoadOfnVocabularyConceptsOptions): Promise<Entities> {
  const store = await loadOfnVocabularyConcepts(options);
  return createRdfsSemanticModelAdapter(store).getAllSemanticEntities();
}
