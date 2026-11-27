import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { ClassProfileDialogState } from "../../dialog/class-profile/edit-class-profile-dialog-state";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { CmeCreateContext, CmeOperationArguments } from "../../operation/operation";
import { emptyAsNull } from "../../utilities/string";
import { dialogSpecializationsToOperation } from "./specialization-adapter";
import { dialogVocabulariesToOperation } from "./controlled-vocabulary-adapter";

/**
 * Batch to apply the edit class profile dialog to the class profile.
 * When the visual model is writable, the "profile of" edges
 * are updated to match the profiled entities.
 *
 * @param entity Edited class profile.
 * @param initialState State the dialog was opened with.
 * @param state State the dialog was confirmed with.
 */
export function createUpdateClassProfileBatch(
  createContext: CmeCreateContext,
  visualModel: VisualModel | null,
  entity: EntityDsIdentifier,
  initialState: ClassProfileDialogState,
  state: ClassProfileDialogState,
) {
  let builder: CmeOperationBatchBuilder<CmeOperationArguments[]> =
    new CmeOperationBatchBuilder(createContext)
      .add(cmeOperations.updateProfileClass, {
        profileModel: state.model.identifier,
        entity,
        ...classProfileDialogStateToValues(state),
      })
      .add(cmeOperations.updateSpecialization, {
        entity,
        model: state.model.identifier,
        previous: dialogSpecializationsToOperation(initialState.specializations),
        next: dialogSpecializationsToOperation(state.specializations),
      })
      .add(cmeOperations.updateControlledVocabularyAssignments, {
        profileModel: state.model.identifier,
        entity,
        previous: dialogVocabulariesToOperation(initialState.controlledVocabularies.items),
        next: dialogVocabulariesToOperation(state.controlledVocabularies.items),
      });
  if (isWritableVisualModel(visualModel)) {
    builder = builder.add(cmeOperations.updateVisualNodeProfiles, {
      visualModel: visualModel.getIdentifier(),
      entity,
      model: state.model.identifier,
      previous: initialState.profiles.map(item => item.identifier),
      next: state.profiles.map(item => item.identifier),
    });
  }
  return builder.build();
}

/**
 * Values shared by create and update of a class profile.
 * The role is stored as a tag.
 */
export function classProfileDialogStateToValues(state: ClassProfileDialogState) {
  const role = state.availableRoles.find(item => item.value === state.role)?.cme ?? null;
  return {
    profileOf: state.profiles.map(item => item.identifier),
    iri: state.iri,
    name: state.name,
    nameSource: state.overrideName ? null :
      state.nameSource.identifier ?? null,
    description: state.description,
    descriptionSource: state.overrideDescription ? null :
      state.descriptionSource.identifier ?? null,
    usageNote: state.usageNote,
    usageNoteSource: state.overrideUsageNote ? null :
      state.usageNoteSource.identifier ?? null,
    externalDocumentationUrl: emptyAsNull(state.externalDocumentationUrl),
    tags: role === null ? [] : [role],
    order: emptyAsNull(state.order),
  };
}

/**
 * Batch to create a class profile from the create class profile dialog.
 *
 * @returns The batch and the reference of the class profile it creates.
 */
export function createCreateClassProfileBatch(
  createContext: CmeCreateContext,
  state: ClassProfileDialogState,
) {
  const create = cmeOperations.createProfileClass.create(createContext, {
    profileModel: state.model.identifier,
    ...classProfileDialogStateToValues(state),
  });
  const batch = new CmeOperationBatchBuilder(createContext)
    .addArguments(create)
    .add(cmeOperations.updateSpecialization, {
      entity: create.identifier,
      model: state.model.identifier,
      previous: [],
      next: dialogSpecializationsToOperation(state.specializations),
    })
    .add(cmeOperations.updateControlledVocabularyAssignments, {
      profileModel: state.model.identifier,
      entity: create.identifier,
      previous: [],
      next: dialogVocabulariesToOperation(state.controlledVocabularies.items),
    })
    .build();
  return {
    batch,
    created: { identifier: create.identifier, model: state.model.identifier },
  };
}
