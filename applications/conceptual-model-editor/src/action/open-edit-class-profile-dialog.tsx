import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import {
  ControlledVocabularyAssignment,
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { updateVisualNodeProfiles } from "../dataspecer/visual-model/operation/update-visual-node-profiles";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  ClassProfileDialogState,
  createEditClassProfileDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditClassProfileDialog } from "../dialog/class-profile/edit-class-profile-dialog";
import {
  classProfileDialogStateToNewCmeClassProfile,
} from "../dialog/class-profile/edit-class-profile-dialog-state-adapter";
import { createLogger } from "../application";
import { InvalidState } from "../application/error";
import { LabelResolver } from "../dependency-tracker";
import { VocabularyItemState } from "../dialog/controlled-vocabularies";
import { CmeReference } from "../dataspecer/cme-model/model";
import { EntityDsIdentifier } from "../dataspecer/entity-model";

const LOG = createLogger(import.meta.url);

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
 * Persists the difference between the controlled vocabularies the dialog
 * started with and what the user ended up with.
 *
 * Assignments are only addressed by vocabulary identifier at the operation
 * level, so a group of assignments for the same vocabulary (allowed, as a
 * class profile can assign the same vocabulary more than once with
 * different qualifiers) can not be diffed item by item - when a group
 * changes at all, it is removed and re-added in full.
 */
function applyControlledVocabularySelection(
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

export function openEditClassProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClassProfile,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const aggregate = graph.aggregatorView.getEntities()?.[entity.id];
  const rawEntity = aggregate?.rawEntity;
  if (rawEntity === null || rawEntity === undefined || !isSemanticModelClassProfile(rawEntity)) {
    LOG.error("Missing raw entity for class profile.", { entity });
    throw new InvalidState();
  }

  const initialState = createEditClassProfileDialogState(
    visualModel, options.language, model, rawEntity, graph.models, tracker,
    labelResolver, graph);

  const onConfirm = (state: ClassProfileDialogState) => {
    const classProfile: CmeReference = { identifier: entity.id, model: model.getId() };

    cmeExecutor.updateClassProfile({
      identifier: entity.id,
      ...classProfileDialogStateToNewCmeClassProfile(state),
    });
    cmeExecutor.updateSpecialization(
      classProfile,
      state.model.identifier,
      initialState.specializations, state.specializations);

    applyControlledVocabularySelection(
      cmeExecutor, classProfile,
      initialState.controlledVocabularies.items, state.controlledVocabularies.items);

    // We need to update visual model: profiles
    if (isWritableVisualModel(visualModel)) {
      updateVisualNodeProfiles(
        visualModel, {
          identifier: entity.id,
          model: model.getId(),
        },
        state.profiles.map(item => ({
          identifier: item.identifier,
          model: item.model
        })),
        state.profiles.map(item => ({
          identifier: item.identifier,
          model: item.model
        })));
    }
  };

  dialogs.openDialog(createEditClassProfileDialog(initialState, onConfirm));
}
