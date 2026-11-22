import type { Entity } from "@dataspecer/core-v2";
import {
  isControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityDsIdentifier } from "../../dataspecer/entity-model";

/**
 * Counts assignments that refer to a controlled vocabulary that is not
 * among the available ones, e.g. because the vocabulary has been deleted.
 *
 * @param assignmentIds Ids of the assignments, including the inherited ones.
 * @param entities Maps an entity identifier to an object holding the raw entity.
 * @param availableVocabularyIds Ids of the available vocabularies, or null
 *  when they are not loaded yet. Nothing can be reported as missing then.
 */
export function countMissingControlledVocabularies(
  assignmentIds: EntityDsIdentifier[] | undefined,
  entities: Record<EntityDsIdentifier, { rawEntity?: Entity | null } | undefined>,
  availableVocabularyIds: ReadonlySet<string> | null,
): number {
  if (availableVocabularyIds === null) {
    return 0;
  }
  let result = 0;
  for (const id of assignmentIds ?? []) {
    const rawEntity = entities[id]?.rawEntity ?? null;
    if (isControlledVocabularyAssignment(rawEntity)
      && !availableVocabularyIds.has(rawEntity.vocabulary)) {
      ++result;
    }
  }
  return result;
}
