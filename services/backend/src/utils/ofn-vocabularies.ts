import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { getSemanticModelMainEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { OperationInModel } from "@dataspecer/core/operation";
import { createCreateModelOperation } from "@dataspecer/core/project-model";
import { loadOfnVocabularyAsSemanticModel } from "@dataspecer/ofn-vocabularies";
import { v4 as uuidv4 } from "uuid";
import { PROJECT_MODEL_ID } from "../models/model-id.ts";
import { diffModelEntitiesToOperations } from "../models/model-operations.ts";

export const OFN_SPARQL_ENDPOINT = "https://data.gov.cz/slovníky/sparql";

export async function loadOfnVocabularyModels(vocabularyIris: string[]): Promise<Record<string, EntityRecord>> {
  const models: Record<string, EntityRecord> = {};
  for (const vocabularyIri of new Set(vocabularyIris)) {
    const modelId = uuidv4();
    models[modelId] = await loadOfnVocabularyAsSemanticModel({
      modelId,
      vocabularyIri,
      sparqlEndpoint: OFN_SPARQL_ENDPOINT,
      fetchImplementation: fetch,
    });
  }
  return models;
}

export function createOfnVocabularyModelOperations(parentIri: string, models: Record<string, EntityRecord>): OperationInModel[] {
  const operations: OperationInModel[] = [];
  for (const [modelId, entities] of Object.entries(models)) {
    const createModel = createCreateModelOperation(parentIri, LOCAL_SEMANTIC_MODEL, modelId);
    createModel.label = getSemanticModelMainEntity(entities)?.label;
    operations.push({ modelId: PROJECT_MODEL_ID, operation: createModel });
    operations.push(...diffModelEntitiesToOperations(modelId, LOCAL_SEMANTIC_MODEL, {}, entities));
  }
  return operations;
}
