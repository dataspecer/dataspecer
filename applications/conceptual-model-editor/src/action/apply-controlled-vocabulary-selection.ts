import { ControlledVocabularyAssignment } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { CmeReference } from "../dataspecer/cme-model/model";
import { EntityDsIdentifier } from "../dataspecer/entity-model";
import { VocabularyItemState } from "../dialog/controlled-vocabularies";

/**
 * A class profile's own controlledVocabularies only ever holds assignments
 * it directly owns - overrides of an inherited qualifier, or vocabularies
 * added directly on this profile. Plain (non-overridden) inherited items are
 * not persisted on this entity at all.
 */
function toOwnAssignments(
  items: VocabularyItemState[],
): ControlledVocabularyAssignment[] {
  const result: ControlledVocabularyAssignment[] = [];
  for (const item of items) {
    if (item.inherited === null) {
      result.push(
        { identifier: item.vocabulary.id, qualifier: item.qualifier, override: false });
    } else if (item.inherited.overrideEnabled) {
      result.push(
        { identifier: item.vocabulary.id, qualifier: item.qualifier, override: true });
    }
  }
  return result;
}

function groupByIdentifier(
  assignments: ControlledVocabularyAssignment[],
): Map<EntityDsIdentifier, ControlledVocabularyAssignment[]> {
  const result = new Map<EntityDsIdentifier, ControlledVocabularyAssignment[]>();
  for (const assignment of assignments) {
    const group = result.get(assignment.identifier) ?? [];
    group.push(assignment);
    result.set(assignment.identifier, group);
  }
  return result;
}

function isSameAssignmentGroup(
  left: ControlledVocabularyAssignment[],
  right: ControlledVocabularyAssignment[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const toKey = (item: ControlledVocabularyAssignment) => `${item.qualifier}|${item.override}`;
  const leftKeys = left.map(toKey).sort();
  const rightKeys = right.map(toKey).sort();
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

/**
 * Persists the difference between the controlled vocabularies a class
 * profile dialog started with and what the user ended up with. Pass an
 * empty "previous" for a freshly created class profile - every selected
 * item is then just added.
 *
 * Assignments are only addressed by vocabulary identifier at the operation
 * level, so a group of assignments for the same vocabulary (allowed, as a
 * class profile can assign the same vocabulary more than once with
 * different qualifiers) can not be diffed item by item - when a group
 * changes at all, it is removed and re-added in full.
 */
export function applyControlledVocabularySelection(
  cmeExecutor: CmeModelOperationExecutor,
  classProfile: CmeReference,
  previous: VocabularyItemState[],
  next: VocabularyItemState[],
): void {
  const previousGroups = groupByIdentifier(toOwnAssignments(previous));
  const nextGroups = groupByIdentifier(toOwnAssignments(next));
  const identifiers = new Set([...previousGroups.keys(), ...nextGroups.keys()]);
  for (const identifier of identifiers) {
    const previousGroup = previousGroups.get(identifier) ?? [];
    const nextGroup = nextGroups.get(identifier) ?? [];
    if (isSameAssignmentGroup(previousGroup, nextGroup)) {
      continue;
    }
    if (previousGroup.length > 0) {
      cmeExecutor.removeControlledVocabularyAssignment(classProfile, identifier);
    }
    for (const assignment of nextGroup) {
      cmeExecutor.addControlledVocabularyAssignment(classProfile, assignment);
    }
  }
}
