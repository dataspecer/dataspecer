
import { VisualModel, isVisualNode, isWritableVisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
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
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  ClassProfileDialogState,
  createNewProfileClassDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import {
  classProfileDialogStateToNewCmeClassProfile,
} from "../dialog/class-profile/edit-class-profile-dialog-state-adapter";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  createNewAssociationProfileDialogState,
} from "@/dialog/association-profile/edit-association-profile-dialog-state";
import { Language } from "@/configuration";
import {
  associationProfileDialogStateToNewCmeRelationshipProfileWithOverriddenEnds,
} from "@/dialog/association-profile/edit-association-profile-dialog-state-adapter";

/**
 * Creates default profiles of given {@link semanticClassesToProfile} and {@link semanticRelationshipsToProfile}.
 * The exact behavior is described here: https://github.com/dataspecer/dataspecer/pull/1201
 */
export async function createDefaultProfilesAction(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  options: Options,
  classesContext: ClassesContextType,
  visualModel: VisualModel | null,
  semanticClassesToProfile: string[],
  semanticRelationshipsToProfile: string[],
  shouldBeAddedToVisualModel: boolean
): Promise<void> {
  const writableSemanticModel = findAnyWritableModelFromRawInput(graph.models, visualModel);
  if (writableSemanticModel === null) {
    notifications.error("There is no InMemorySemanticModel to put the profiles into.");
    return;
  }
  // We have to wait otherwise we might start creating relation profiles for non-existing class profiles
  const createdClassProfiles = await createDefaultClassProfiles(
    cmeExecutor, notifications, graph, diagram, options.language, classesContext,
    visualModel, semanticClassesToProfile, shouldBeAddedToVisualModel);
  createDefaultRelationshipProfiles(
    notifications, classesContext, graph, diagram, options.language, visualModel,
    writableSemanticModel, cmeExecutor, semanticRelationshipsToProfile,
    createdClassProfiles, shouldBeAddedToVisualModel);
};

/**
 * Creates classes and class profiles from given {@link classesAndClassProfilesToProfile} containing
 * semantic identifiers of entities to profile and adds the profiles to the visual model.
 * @returns The created map of created class and class profiles. Key is the identifier from
 *  {@link classesAndClassProfilesToProfile} and value is the identifier of the created profile.
 *  Or null, if it is explicitly null, then it means that we failed to create the class profile for some reason.
 */
async function createDefaultClassProfiles(
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  classesContext: ClassesContextType,
  visualModel: VisualModel | null,
  classesAndClassProfilesToProfile: string[],
  shouldBeAddedToVisualModel: boolean
): Promise<Record<string, (string | null)[]>> {
  const createdClassProfiles: Record<string, (string | null)[]> = {};
  for (const entityToProfile of classesAndClassProfilesToProfile) {
    const createdClassProfile = await createDefaultClassProfile(
      cmeExecutor, notifications, graph, diagram, language, classesContext,
      visualModel, entityToProfile, shouldBeAddedToVisualModel);

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
  cmeExecutor: CmeModelOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  classesContext: ClassesContextType,
  visualModel: VisualModel | null,
  entityToProfile: string,
  shouldBeAddedToVisualModel: boolean
): Promise<string | null> {
  const classOrClassProfileToBeProfiled = graph.aggregatorView.getEntities()?.[entityToProfile]?.aggregatedEntity;
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
    classesContext, graph, visualModel, language,
    [classOrClassProfileToBeProfiled.id],
  );
  const createdClassProfile = createClassProfile(profileClassState, cmeExecutor);
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

function createClassProfile(
  state: ClassProfileDialogState,
  cmeExecutor: CmeModelOperationExecutor
) {
  return cmeExecutor.createClassProfile(classProfileDialogStateToNewCmeClassProfile(state));
}

function createDefaultRelationshipProfiles(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  visualModel: VisualModel | null,
  writableCmeModel: CmeSemanticModel,
  cmeExecutor: CmeModelOperationExecutor,
  edgesToProfile: string[],
  createdClassProfiles: Record<string, (string | null)[]>,
  shouldBeAddedToVisualModel: boolean
) {
  // Casting ... the correctness should be already validated
  const writableSemanticModel = graph.models.get(writableCmeModel.identifier) as InMemorySemanticModel;
  for (const edgeToProfile of edgesToProfile) {
    createDefaultRelationshipProfile(
      notifications, classesContext, graph, diagram, language, writableSemanticModel, cmeExecutor, visualModel,
      edgeToProfile, createdClassProfiles, shouldBeAddedToVisualModel);
  }
}

/**
 * Creates relationship profile of given entity with default parameters,
 * that it is the resulting relationship profile is the same as if the user opened the dialog and
 * clicked accept without changing anything.
 */
async function createDefaultRelationshipProfile(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  language: Language,
  model: InMemorySemanticModel,
  cmeExecutor: CmeModelOperationExecutor,
  visualModel: VisualModel | null,
  entityToProfile: string,
  createdClassProfiles: Record<string, (string | null)[]>,
  shouldBeAddedToVisualModel: boolean
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
        cmeExecutor, notifications, graph, diagram, language, classesContext,
        visualModel, end.concept, shouldBeAddedToVisualModel);

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
    classesContext, graph, visualModel, language, [relationshipToProfile.id]);

  const result = cmeExecutor.createRelationshipProfile(
    associationProfileDialogStateToNewCmeRelationshipProfileWithOverriddenEnds(
      relationshipProfileState, ends[0].concept, ends[1].concept));
  cmeExecutor.updateSpecialization(result, relationshipProfileState.model.identifier,
    [], relationshipProfileState.specializations);

  if (shouldBeAddedToVisualModel) {
    if (isWritableVisualModel(visualModel)) {
      addSemanticRelationshipProfileToVisualModelAction(
        notifications, graph, visualModel, result.identifier, model.getId());
    }
  }
}

function getAndValidateRelationshipToBeProfiled(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  entityToProfile: string
): SemanticModelRelationship | SemanticModelRelationshipProfile | null {
  const relationshipToProfile = graph.aggregatorView.getEntities()?.[entityToProfile]?.aggregatedEntity;
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
