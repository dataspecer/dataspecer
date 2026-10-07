import type { EntityRecord } from "@dataspecer/core/entity-model";
import {
  CONTROLLED_VOCABULARY_TYPE,
  DEFAULT_CONTROLLED_VOCABULARY,
  type ControlledVocabulary,
} from "./concepts/controlled-vocabulary.ts";

/**
 * Converts the stored JSON serialization of a controlled vocabulary model to
 * its entities. A controlled vocabulary model has exactly one entity - the
 * vocabulary itself - keyed by the model's own id. Missing data (a freshly
 * created model) yields the default vocabulary fields.
 */
export function serializationToControlledVocabularyModelEntities(modelId: string, data: unknown): EntityRecord {
  const entity: ControlledVocabulary = {
    ...DEFAULT_CONTROLLED_VOCABULARY,
    ...((data as object) ?? {}),
    id: modelId,
    type: [CONTROLLED_VOCABULARY_TYPE],
  };
  return { [modelId]: entity };
}

/**
 * TODO: add JSON-LD context on serialization
 * Converts the entities of a controlled vocabulary model back to its JSON
 * serialization. Inverse of {@link serializationToControlledVocabularyModelEntities}.
 */
export function controlledVocabularyModelEntitiesToSerialization(modelId: string, entities: EntityRecord): unknown {
  const { id: _id, type: _type, ...rest } = (entities[modelId] as ControlledVocabulary | undefined) ?? {
    id: modelId,
    ...DEFAULT_CONTROLLED_VOCABULARY,
  };
  return rest;
}
