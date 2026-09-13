import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { CmeReference } from "../dataspecer/cme-model/model";
import { EntityDsIdentifier } from "../dataspecer/entity-model";
import { VocabularyItemState } from "../dialog/controlled-vocabularies";

/**
 * A row is "own" (persisted, or to be persisted, as this class profile's
 * own assignment) when it is a directly added vocabulary, or an inherited
 * one with its override enabled. A plain inherited row that has not been
 * overridden is never persisted.
 */
function isOwnItem(item: VocabularyItemState): boolean {
  return item.inherited === null || item.inherited.overrideEnabled;
}

/**
 * Persists the difference between the controlled vocabularies a class
 * profile dialog started with and what the user ended up with. Pass an
 * empty "previous" for a freshly created class profile - every own item
 * is then just created.
 *
 * Each row addresses its own persisted ControlledVocabularyAssignment
 * entity by VocabularyItemState.id (null until the row is first saved),
 * so rows are diffed individually - create, modify, or remove - rather
 * than as a group.
 */
export function applyControlledVocabularySelection(
  cmeExecutor: CmeModelOperationExecutor,
  classProfile: CmeReference,
  previous: VocabularyItemState[],
  next: VocabularyItemState[],
): void {
  const previousOwnById = new Map(
    previous
      .filter(isOwnItem)
      .filter((item): item is VocabularyItemState & { id: EntityDsIdentifier } => item.id !== null)
      .map(item => [item.id, item]));

  const nextOwnIds = new Set(
    next
      .filter(isOwnItem)
      .map(item => item.id)
      .filter((id): id is EntityDsIdentifier => id !== null));

  for (const item of next) {
    if (!isOwnItem(item)) {
      continue;
    }
    if (item.id === null) {
      cmeExecutor.createControlledVocabularyAssignment(classProfile, {
        vocabulary: item.vocabulary.id,
        qualifier: item.qualifier,
        replaces: item.inherited === null
          ? null
          : { kind: "local", target: item.inherited.assignmentId },
      });
      continue;
    }
    const before = previousOwnById.get(item.id);
    if (before !== undefined && before.qualifier !== item.qualifier) {
      cmeExecutor.modifyControlledVocabularyAssignment(
        { identifier: item.id, model: classProfile.model },
        { qualifier: item.qualifier });
    }
  }

  for (const [id] of previousOwnById) {
    if (!nextOwnIds.has(id)) {
      cmeExecutor.removeControlledVocabularyAssignment(
        { identifier: id, model: classProfile.model });
    }
  }
}
