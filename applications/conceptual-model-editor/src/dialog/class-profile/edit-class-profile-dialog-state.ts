import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";
import {
  type BaseEntityProfileDialogState,
  createEditBaseEntityProfileDialogState,
  createNewBaseEntityProfileDialogState,
} from "../base-entity-profile/base-entity-profile-dialog-state";
import {
  type EntityRepresentative,
  listClassToProfilesFromTracker,
  listClassToSpecializeFromTracker,
  representUndefinedClass,
} from "../utilities/dialog-utilities";
import { DialogSemanticTracker } from "../../dialog-v2/dialog-semantic-tracker";
import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { semanticModelTrackerToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import { configuration } from "../../application";
import { LabelResolver } from "../../dependency-tracker";
import {
  ControlledVocabularyAssignment,
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeClassProfileRole } from "@/dataspecer/cme-model/model";
import { ModelGraphContextType } from "../../context/model-context";
import {
  ControlledVocabulary,
  ControlledVocabularyOverride,
  ControlledVocabularyUsage,
  createSelectControlledVocabulariesState,
  SelectControlledVocabulariesState,
} from "../controlled-vocabularies";
import { MOCK_AVAILABLE_VOCABULARIES } from "../controlled-vocabularies/mock-available-vocabularies";

export interface ClassProfileDialogState
  extends BaseEntityProfileDialogState<EntityRepresentative> {

  availableRoles: {

    value: string;

    label: string;

    cme: CmeClassProfileRole | null;

  }[];

  role: string;

  controlledVocabularies: SelectControlledVocabulariesState;

}

/**
 * Builds the controlled-vocabularies sub-state for the class-profile dialog.
 *
 * "inherited" is resolved by reading each direct profiled ancestor's own
 * controlledVocabularies from the aggregator - the dialog tracker does not
 * carry this field. Only one level of ancestry is resolved; ancestors that
 * are themselves profiles of something with controlled vocabularies are not
 * walked further yet.
 *
 * availableVocabularies is mocked until controlled vocabularies are loaded
 * from the controlled vocabulary model.
 */
function createClassProfileControlledVocabulariesState(
  graph: ModelGraphContextType,
  ancestorIdentifiers: EntityDsIdentifier[],
  ownAssignments: ControlledVocabularyAssignment[] | undefined,
): SelectControlledVocabulariesState {
  const availableVocabularies = MOCK_AVAILABLE_VOCABULARIES;

  const entities = graph.aggregatorView.getEntities();
  const inheritedAssignments = ancestorIdentifiers.flatMap(identifier => {
    const rawEntity = entities[identifier]?.rawEntity;
    if (rawEntity === null || rawEntity === undefined
      || !isSemanticModelClassProfile(rawEntity)) {
      return [];
    }
    return rawEntity.controlledVocabularies ?? [];
  });
  const inherited = toControlledVocabularyUsages(
    inheritedAssignments, availableVocabularies);

  const ownItems = ownAssignments ?? [];
  const overrides: ControlledVocabularyOverride[] = ownItems
    .filter(item => item.override)
    .map(item => ({ vocabularyId: item.identifier, qualifier: item.qualifier }));
  const added = toControlledVocabularyUsages(
    ownItems.filter(item => !item.override), availableVocabularies);

  return createSelectControlledVocabulariesState(
    inherited, overrides, added, availableVocabularies);
}

function toControlledVocabularyUsages(
  assignments: ControlledVocabularyAssignment[],
  availableVocabularies: ControlledVocabulary[],
): ControlledVocabularyUsage[] {
  const result: ControlledVocabularyUsage[] = [];
  for (const assignment of assignments) {
    const vocabulary = availableVocabularies.find(
      item => item.id === assignment.identifier);
    if (vocabulary === undefined) {
      continue;
    }
    result.push({ vocabulary, qualifier: assignment.qualifier });
  }
  return result;
}

const ROLES = [{
  value: "undefined",
  label: "class-profile.role.undefined",
  cme: null,
}, {
  value: "main",
  label: "class-profile.role.main",
  cme: CmeClassProfileRole.Main,
}, {
  value: "supportive",
  label: "class-profile.role.supportive",
  cme: CmeClassProfileRole.Supportive,
}];

export function createNewProfileClassDialogState(
  visualModel: VisualModel | null,
  language: string,
  profilesIdentifiers: EntityDsIdentifier[],
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  graph: ModelGraphContextType,
): ClassProfileDialogState {

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor);

  const noProfile = representUndefinedClass();

  const allProfiles = listClassToProfilesFromTracker(tracker, labelResolver);

  const allSpecializations = listClassToSpecializeFromTracker(tracker, labelResolver);

  // EntityProfileState

  const entityProfileState = createNewBaseEntityProfileDialogState(
    language, configuration().languagePreferences, allModels,
    allProfiles, profilesIdentifiers, noProfile, allSpecializations,
    configuration().classNameToIri);

  return {
    ...entityProfileState,
    isIriAutogenerated: true,
    // Role
    availableRoles: ROLES,
    role: ROLES[0].value,
    controlledVocabularies: createClassProfileControlledVocabulariesState(
      graph, profilesIdentifiers, undefined),
  };
}

/**
 * @throws InvalidState
 */
export function createEditClassProfileDialogState(
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelClassProfile,
  entityModels: Map<string, EntityModel>,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
  graph: ModelGraphContextType,
): ClassProfileDialogState {

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor);

  const noProfile = representUndefinedClass();

  const allProfiles = listClassToProfilesFromTracker(tracker, labelResolver)
    .filter(item => item.identifier !== entity.id);

  const allSpecializations = listClassToSpecializeFromTracker(tracker, labelResolver);

  // EntityProfileState

  const entityProfileState = createEditBaseEntityProfileDialogState(
    language, entityModels, allModels,
    { identifier: entity.id, model: model.getId() },
    allProfiles, entity.profiling, noProfile,
    entity.iri ?? "",
    entity.name, entity.nameFromProfiled,
    entity.description, entity.descriptionFromProfiled,
    entity.externalDocumentationUrl ?? "",
    entity.usageNote, entity.usageNoteFromProfiled,
    allSpecializations,
    entity.order ?? "");

  return {
    ...entityProfileState,
    // Role
    availableRoles: ROLES,
    role: ROLES.find(item => entity.tags?.includes(item.cme ?? ""))?.value
      ?? ROLES[0].value,
    controlledVocabularies: createClassProfileControlledVocabulariesState(
      graph, entity.profiling, entity.controlledVocabularies),
  };
}
