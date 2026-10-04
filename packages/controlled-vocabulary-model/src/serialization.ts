import type { EntityRecord } from "@dataspecer/core/entity-model";
import {
  CONTROLLED_VOCABULARY_TYPE,
  DEFAULT_CONTROLLED_VOCABULARY,
  type ControlledVocabulary,
} from "./concepts/controlled-vocabulary.ts";

/**
 * Vocabularies stored before the optional fields became nullable hold an
 * empty string instead of null.
 */
function emptyToNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Converts the stored JSON serialization of a controlled vocabulary model to
 * its entities. A controlled vocabulary model has exactly one entity - the
 * vocabulary itself - keyed by the model's own id. Missing data (a freshly
 * created model) yields the default vocabulary fields.
 */
export function serializationToControlledVocabularyModelEntities(modelId: string, data: unknown): EntityRecord {
  const stored = (data as Partial<ControlledVocabulary> | null) ?? {};
  const entity: ControlledVocabulary = {
    ...DEFAULT_CONTROLLED_VOCABULARY,
    ...stored,
    pattern: emptyToNull(stored.pattern),
    documentation: emptyToNull(stored.documentation),
    distribution: {
      downloadUrl: emptyToNull(stored.distribution?.downloadUrl),
      accessUrl: stored.distribution?.accessUrl ?? DEFAULT_CONTROLLED_VOCABULARY.distribution.accessUrl,
    },
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
