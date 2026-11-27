
import { VisualModel, isVisualNode, isWritableVisualModel } from "@dataspecer/visual-model";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { Options } from "../application";
import {
  SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { addSemanticClassProfileToVisualModelAction } from "./add-class-profile-to-visual-model";
import { UseDiagramType } from "../diagram/diagram-hook";
import { addSemanticRelationshipProfileToVisualModelAction } from "./add-relationship-profile-to-visual-model";
import { findAnyWritableModelFromRawInput } from "../dataspecer/cme-model/cme-model-utilities";
import { CmeSemanticModel } from "../dataspecer/cme-model";
import { CmeOperationBatchBuilder, CmeOperationExecutor, cmeOperations } from "../operation";
import { classProfileDialogStateToValues } from "./utilities/update-class-profile-batch";
import { dialogVocabulariesToOperation } from "./utilities/controlled-vocabulary-adapter";
import { createCreateRelationshipProfileBatch } from "./utilities/update-relationship-profile-batch";
import { reportFailure } from "./utilities/report-failure";
import {
  ClassProfileDialogState,
  createNewProfileClassDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  createNewAssociationProfileDialogState,
} from "../dialog/association-profile/edit-association-profile-dialog-state";
import { Language } from "../configuration";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { LabelResolver } from "../dependency-tracker";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

/**
 * Creates default profiles of given {@link semanticClassesToProfile} and {@link semanticRelationshipsToProfile}.
 * The exact behavior is described here: https://github.com/dataspecer/dataspecer/pull/1201
 */
export async function createDefaultProfilesAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  options: Options,
  classesContext: ClassesContext,
  visualModel: VisualModel | null,
  semanticClassesToProfile: string[],
  semanticRelationshipsToProfile: string[],
  shouldBeAddedToVisualModel: boolean,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
): Promise<void> {
  const writableSemanticModel = findAnyWritableModelFromRawInput(classesContext.semanticModels, visualModel);
  if (writableSemanticModel === null) {
    notifications.error("There is no InMemorySemanticModel to put the profiles into.");
    return;
  }
  // We have to wait otherwise we might start creating relation profiles for non-existing class profiles
  const createdClassProfiles = await createDefaultClassProfiles(
    executor, notifications, graph, diagram, options.language, classesContext,
    visualModel, semanticClassesToProfile, shouldBeAddedToVisualModel, tracker,
    labelResolver, availableVocabularies);
  createDefaultRelationshipProfiles(
    notifications, classesContext, graph, diagram, options.language, visualModel,
    writableSemanticModel, executor, semanticRelationshipsToProfile,
    createdClassProfiles, shouldBeAddedToVisualModel, tracker, labelResolver,
    availableVocabularies);
};

/**
 * Creates classes and class profiles from given {@link classesAndClassProfilesToProfile} containing
 * semantic identifiers of entities to profile and adds the profiles to the visual model.
 * @returns The created map of created class and class profiles. Key is the identifier from
 *  {@link classesAndClassProfilesToProfile} and value is the identifier of the created profile.
 *  Or null, if it is explicitly null, then it means that we failed to create the class profile for some reason.
 */
async function createDefaultClassProfiles(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  classesContext: ClassesContext,
  visualModel: VisualModel | null,
  classesAndClassProfilesToProfile: string[],
  shouldBeAddedToVisualModel: boolean,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
): Promise<Record<string, (string | null)[]>> {
  const createdClassProfiles: Record<string, (string | null)[]> = {};
  for (const entityToProfile of classesAndClassProfilesToProfile) {
    const createdClassProfile = await createDefaultClassProfile(
      executor, notifications, graph, diagram, language, classesContext,
      visualModel, entityToProfile, shouldBeAddedToVisualModel, tracker,
      labelResolver, availableVocabularies);

    if (createdClassProfiles[entityToProfile] === undefined) {
      createdClassProfiles[entityToProfile] = [];
    }
    createdClassProfiles[entityToProfile].push(createdClassProfile);
  }
  return createdClassProfiles;
}

/**
 * Creates class profile of given entity with default parameters,
 * that it is the resulting class profile is the same as if the user opened the dialog and clicked accept without
 * changing anything.
 * @returns The identifier of the created class profile or null if the creation of profile failed
 */
async function createDefaultClassProfile(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  classesContext: ClassesContext,
  visualModel: VisualModel | null,
  entityToProfile: string,
  shouldBeAddedToVisualModel: boolean,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
): Promise<string | null> {
  const classOrClassProfileToBeProfiled = graph.getAggregatedEntities()?.[entityToProfile]?.aggregatedEntity;
  if (classOrClassProfileToBeProfiled === undefined || classOrClassProfileToBeProfiled === null) {
    notifications.error("The entity (node) to be profiled from selection is not present in aggregatorView");
    return null;
  }
  const isTheProfiledClassClassProfile = isSemanticModelClassProfile(classOrClassProfileToBeProfiled);
  const isTheProfiledClassClass = isSemanticModelClass(classOrClassProfileToBeProfiled);
  if (!isTheProfiledClassClass && !isTheProfiledClassClassProfile) {
    notifications.error("The entity to be profiled from selection is not a class or class profile");
    return null;
  }

  const profileClassState = createNewProfileClassDialogState(
    visualModel, language, [classOrClassProfileToBeProfiled.id], tracker,
    labelResolver, graph, availableVocabularies);
  const createdClassProfile = await createClassProfile(
    executor, notifications, profileClassState);
  if (createdClassProfile === null) {
    return null;
  }
  if (shouldBeAddedToVisualModel) {
    if (isWritableVisualModel(visualModel)) {
      const visualNode = visualModel.getVisualEntitiesForRepresented(entityToProfile)?.[0] ?? null;
      let position = null;
      if (isVisualNode(visualNode)) {
        position = visualNode.position;
      }

      await addSemanticClassProfileToVisualModelAction(
        notifications, graph, classesContext, visualModel, diagram,
        createdClassProfile.identifier, createdClassProfile.model, position);
    }
  }

  return createdClassProfile.identifier;
}

/**
 * @returns Reference of the created class profile or null on failure.
 */
async function createClassProfile(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  state: ClassProfileDialogState,
) {
  // Specializations are not created here, as in the legacy implementation.
  const create = cmeOperations.createProfileClass.create(executor.createContext, {
    profileModel: state.model.identifier,
    ...classProfileDialogStateToValues(state),
  });
  const outcome = await executor.execute(new CmeOperationBatchBuilder(executor.createContext)
    .addArguments(create)
    .add(cmeOperations.updateControlledVocabularyAssignments, {
      profileModel: state.model.identifier,
      entity: create.identifier,
      previous: [],
      next: dialogVocabulariesToOperation(state.controlledVocabularies.items),
    })
    .build());
  if (reportFailure(notifications, outcome, "Can not create the class profile.")) {
    return null;
  }
  return { identifier: create.identifier, model: state.model.identifier };
}

function createDefaultRelationshipProfiles(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContext,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  visualModel: VisualModel | null,
  writableCmeModel: CmeSemanticModel,
  executor: CmeOperationExecutor,
  edgesToProfile: string[],
  createdClassProfiles: Record<string, (string | null)[]>,
  shouldBeAddedToVisualModel: boolean,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
) {
  // Casting ... the correctness should be already validated
  const writableSemanticModel = classesContext.semanticModels.get(writableCmeModel.identifier) as InMemorySemanticModel;
  for (const edgeToProfile of edgesToProfile) {
    createDefaultRelationshipProfile(
      notifications, classesContext, graph, diagram, language,
      writableSemanticModel, executor, visualModel,
      edgeToProfile, createdClassProfiles, shouldBeAddedToVisualModel, tracker,
      labelResolver, availableVocabularies);
  }
}

/**
 * Creates relationship profile of given entity with default parameters,
 * that it is the resulting relationship profile is the same as if the user opened the dialog and
 * clicked accept without changing anything.
 */
async function createDefaultRelationshipProfile(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContext,
  graph: UseModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  model: InMemorySemanticModel,
  executor: CmeOperationExecutor,
  visualModel: VisualModel | null,
  entityToProfile: string,
  createdClassProfiles: Record<string, (string | null)[]>,
  shouldBeAddedToVisualModel: boolean,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  availableVocabularies: ControlledVocabulary[],
) {
  const relationshipToProfile = getAndValidateRelationshipToBeProfiled(notifications, graph, entityToProfile);
  if (relationshipToProfile === null) {
    return;
  }

  const ends: SemanticModelRelationshipEndProfile[] | undefined = [];
  for (const end of relationshipToProfile.ends) {
    if (end.concept === null) {
      return;
    }
    // The creation of the class profile failed, so the created profiled association should fail as well
    if (createdClassProfiles[end.concept] !== undefined && createdClassProfiles[end.concept].includes(null)) {
      notifications.error("Relationship is not profiled, since one of the end classes couldn't be profiled");
      return;
    }

    let relationshipProfileEnd: string;
    if (createdClassProfiles[end.concept] === undefined || createdClassProfiles[end.concept].length > 1) {
      const possibleEnd = await createDefaultClassProfile(
        executor, notifications, graph, diagram, language, classesContext,
        visualModel, end.concept, shouldBeAddedToVisualModel, tracker,
        labelResolver, availableVocabularies);

      if (possibleEnd === null) {
        notifications.error("Can not create relationship profile end");
        return;
      }

      relationshipProfileEnd = possibleEnd;
    }
    else {
      relationshipProfileEnd = createdClassProfiles[end.concept][0] as string;
    }

    const newEnd: SemanticModelRelationshipEndProfile = {
      usageNote: (end as SemanticModelRelationshipEndProfile)?.usageNote ?? null,
      cardinality: end.cardinality ?? null,
      concept: relationshipProfileEnd ?? end.concept,
      externalDocumentationUrl: end.externalDocumentationUrl ?? null,
      iri: end.iri,
      description: end.description,

      tags: [],
      name: null,
      nameFromProfiled: null,
      descriptionFromProfiled: null,
      profiling: [],
      usageNoteFromProfiled: null,
    };

    ends.push(newEnd);
  }

  const relationshipProfileState = createNewAssociationProfileDialogState(
    visualModel, language, [relationshipToProfile.id], tracker, labelResolver);

  const { batch, created: result } = createCreateRelationshipProfileBatch(
    executor.createContext, relationshipProfileState,
    { domain: ends[0].concept, range: ends[1].concept });
  const outcome = await executor.execute(batch);
  if (reportFailure(notifications, outcome, "Can not create the relationship profile.")) {
    return;
  }

  if (shouldBeAddedToVisualModel) {
    if (isWritableVisualModel(visualModel)) {
      addSemanticRelationshipProfileToVisualModelAction(
        notifications, graph, visualModel, result.identifier, model.getId());
    }
  }
}

function getAndValidateRelationshipToBeProfiled(
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  entityToProfile: string
): SemanticModelRelationship | SemanticModelRelationshipProfile | null {
  const relationshipToProfile = graph.getAggregatedEntities()?.[entityToProfile]?.aggregatedEntity;
  if (relationshipToProfile === undefined || relationshipToProfile === null) {
    notifications.error("The entity (edge) to be profiled from selection is not present in aggregatorView");
    return null;
  }
  if (isSemanticModelGeneralization(relationshipToProfile)) {
    return null;
  }
  if (!isSemanticModelRelationship(relationshipToProfile) &&
    !isSemanticModelRelationshipProfile(relationshipToProfile)) {
    notifications.error("The entity to be profiled from selection is not a association or association profile");
    return null;
  }

  return relationshipToProfile;
}
