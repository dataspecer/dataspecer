import { getReferencedVocabularyId, VocabularyItemState } from "../../dialog/controlled-vocabularies";
import {
  OwnControlledVocabularyAssignment,
} from "../../operation/implementation/profile-model/update-controlled-vocabulary-assignments";

/**
 * Convert the rows of a controlled vocabulary selection to the
 * {@link cmeOperations.updateControlledVocabularyAssignments} arguments.
 *
 * A row is "own" when it is a directly added vocabulary, or an inherited
 * one with its override enabled. A plain inherited row that has not been
 * overridden is never persisted, so it is left out.
 */
export function dialogVocabulariesToOperation(
  items: VocabularyItemState[],
): OwnControlledVocabularyAssignment[] {
  return items
    .filter(item => item.inherited === null || item.inherited.overrideEnabled)
    .map(item => ({
      assignment: item.entityId,
      vocabulary: getReferencedVocabularyId(item.vocabulary),
      qualifier: item.qualifier,
      replaces: item.inherited === null
        ? null
        : { kind: "local", target: item.inherited.assignmentId },
    }));
}
