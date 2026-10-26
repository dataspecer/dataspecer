import type { Store } from "n3";
import { loadVocabularyConceptsSparqlQuery } from "./load-vocabulary-concepts.sparql.ts";
import { executeSparqlConstructQuery, type SparqlQueryOptions } from "./sparql.ts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { MainSemanticModelEntity, VocabularySourceOFN } from "@dataspecer/core-v2/semantic-model/concepts";
import { createRdfsSemanticModelAdapter } from "@dataspecer/core-v2/semantic-model/rdfs";

export interface LoadOfnVocabularyConceptsOptions extends SparqlQueryOptions {
  vocabularyIri: string;
}

export async function loadOfnVocabularyConcepts(options: LoadOfnVocabularyConceptsOptions): Promise<Store> {
  return executeSparqlConstructQuery(options, loadVocabularyConceptsSparqlQuery(options.vocabularyIri));
}

export async function loadOfnVocabularyAsSemanticModelConcepts(options: LoadOfnVocabularyConceptsOptions): Promise<EntityRecord> {
  const store = await loadOfnVocabularyConcepts(options);
  return createRdfsSemanticModelAdapter(store).getAllSemanticEntities();
}

export interface LoadOfnVocabularySemanticModelOptions extends LoadOfnVocabularyConceptsOptions {
  modelId: string;
}

export async function loadOfnVocabularyAsSemanticModel(options: LoadOfnVocabularySemanticModelOptions): Promise<EntityRecord> {
  const store = await executeSparqlConstructQuery(options, loadVocabularyConceptsSparqlQuery(options.vocabularyIri, true));
  if (!store.countQuads(options.vocabularyIri, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "https://slovník.gov.cz/generický/datový-slovník-ofn-slovníků/pojem/slovník", null)) {
    throw new Error(`OFN vocabulary not found: ${options.vocabularyIri}`);
  }
  const label: Record<string, string> = {};
  for (const term of store.getObjects(options.vocabularyIri, "http://www.w3.org/2004/02/skos/core#prefLabel", null)) {
    if (term.termType === "Literal") label[term.language] ??= term.value;
  }
  const source: VocabularySourceOFN = {
    type: "snapshot",
    provider: "ofn",
    endpoint: options.sparqlEndpoint,
    vocabularyIri: options.vocabularyIri,
  };
  const mainEntity: MainSemanticModelEntity = {
    id: options.modelId,
    type: [LOCAL_SEMANTIC_MODEL],
    label,
    source,
  };
  const entities = createRdfsSemanticModelAdapter(store).getAllSemanticEntities();
  if (Object.hasOwn(entities, options.modelId)) throw new Error(`Model ID conflicts with a concept: ${options.modelId}`);
  return { ...entities, [options.modelId]: mainEntity };
}
