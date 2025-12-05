import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { createLogger } from "../../application";
import { InvalidState } from "../../application/error";
import { CmeSemanticModel, filterWritableModels } from "../../dataspecer/cme-model";
import { EntityDsIdentifier, LanguageString, UNDEFINED_MODEL } from "../../dataspecer/entity-model";
import { absoluteIriToRelative, isRelativeIri } from "../../utilities/iri";
import { sanitizeDuplicitiesInRepresentativeLabels } from "../../utilities/label";
import { languageStringToString } from "../../utilities/string";
import { BaseEntityDialogState } from "../base-entity/base-entity-dialog-state";
import { EntityRepresentative, sortRepresentatives } from "../utilities/dialog-utilities";
import { validationNoProblem } from "../utilities/validation-utilities";
import { CmeReference, CmeSpecialization } from "../../dataspecer/cme-model/model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { EntityModel } from "@dataspecer/core-v2";
import { isInMemorySemanticModel } from "../../dataspecer/semantic-model";

const LOG = createLogger(import.meta.url);

/**
 * Should be used instead of {@link BaseEntityDialogState} for profiles.
 *
 * We need to be able to represent a situation where no profile is selected,
 * or available. This can be done using null or special value.
 * We use special value to represent absence of a profile or value in general.
 *
 */
export interface BaseEntityProfileDialogState<
  ProfileType extends EntityRepresentative,
> extends BaseEntityDialogState {

  /**
   * If true, name is changed in this profile.
   */
  overrideName: boolean;

  /**
   * If {@link overrideName} is false, defines a source of a name.
   */
  nameSource: ProfileType;

  /**
   * Value of a name from {@link nameSource} or empty value.
   * Can be set to no-source value.
   */
  nameSourceValue: LanguageString;

  /**
   * Hide name profile options.
   */
  hideNameProfile: boolean;

  /**
   * If true, description is changed in this profile.
   */
  overrideDescription: boolean;

  /**
   * If {@link overrideDescription} is false, defines a source for a description.
   * Can be set to no-source value.
   */
  descriptionSource: ProfileType;

  /**
   * Value of a description from {@link descriptionSource} or empty value.
   */
  descriptionSourceValue: LanguageString;

  /**
   * Hide description profile options.
   */
  hideDescriptionProfile: boolean;

  /**
   * List of entities that can be profiles.
   */
  availableProfiles: ProfileType[];

  /**
   * Selected profiles.
   */
  profiles: ProfileType[];

  /**
   * Value to use when there is no available profile, should
   */
  noProfile: ProfileType;

  /**
   * Usage note.
   */
  usageNote: LanguageString;

  /**
   * If true, usage note is changed in this profile.
   */
  overrideUsageNote: boolean;

  /**
   * If {@link overrideUsageNote} is false, defines a source of a name.
   * Can be set to no-source value.
   */
  usageNoteSource: ProfileType;

  /**
   * Value of a usage note from {@link usageNoteSource} or empty value.
   */
  usageNoteSourceValue: LanguageString;

  /**
   * If true user should not see option to inherit usage note from profile.
   * We use this when {@link availableUsageNoteSources} is empty.
   */
  hideUsageNoteProfile: boolean;

  /**
   * We can not use {@link profiles} as values for {@link usageNoteSource}.
   * Only profiles can be used as sources.
   */
  availableUsageNoteSources: ProfileType[];

  /**
   * List of all specializations.
   */
  allSpecializations: EntityRepresentative[];

}

/**
 * Create a state for new entity with given profiles.
 *
 * @parem noProfile Value to use where no profile is available.
 * @throws InvalidState
 */
export function createNewBaseEntityProfileDialogState<
  ProfileType extends EntityRepresentative,
>(
  language: string,
  languagePreferences: string[],
  allModels: CmeSemanticModel[],
  allProfiles: ProfileType[],
  profileIdentifiers: EntityDsIdentifier[],
  noProfile: ProfileType,
  allSpecializations: EntityRepresentative[],
  generateIriFromName: (name: string) => string,
): BaseEntityProfileDialogState<ProfileType> {
  const writableModels = prepareWritableModels(allModels);
  const model = writableModels[0];

  const profiles = prepareProfiles(allProfiles, profileIdentifiers, noProfile);
  const iri = prepareNewProfileIri(
    language, languagePreferences, generateIriFromName, profiles[0])
  const name = profiles[0].label;
  const description = profiles[0].description;
  const availableUsageNoteSources = filterProfiles(profiles);
  if (availableUsageNoteSources.length === 0) {
    availableUsageNoteSources.push(noProfile);
  }

  const availableSpecializations = sanitizeDuplicitiesInRepresentativeLabels(
    allModels,
    allSpecializations.filter(item => item.model === model.identifier));
  sortRepresentatives(language, availableSpecializations);

  const source = profiles[0];
  const usageNoteSource = availableUsageNoteSources[0];
  const usageNote = usageNoteSource.usageNote ?? {};
  return {
    language,
    // Model
    allModels: allModels,
    availableModels: writableModels,
    model,
    disableModelChange: false,
    // IRI
    iri,
    isIriAutogenerated: false,
    isIriRelative: true,
    iriValidation: validationNoProblem(),
    // Profile
    availableProfiles: sanitizeDuplicitiesInRepresentativeLabels(
      allModels, allProfiles),
    profiles,
    noProfile,
    // Name
    name,
    overrideName: false,
    nameSource: source,
    nameSourceValue: source.label,
    hideNameProfile: source === noProfile,
    // Description
    description,
    overrideDescription: false,
    descriptionSource: source,
    descriptionSourceValue: source.description,
    hideDescriptionProfile: source === noProfile,
    // Specialization
    allSpecializations,
    availableSpecializations,
    specializations: [],
    // Usage note.
    usageNote,
    overrideUsageNote: usageNoteSource === noProfile,
    usageNoteSource: usageNoteSource,
    usageNoteSourceValue: usageNoteSource.usageNote ?? {},
    availableUsageNoteSources,
    hideUsageNoteProfile: usageNoteSource === noProfile,
    //
    externalDocumentationUrl: "",
  };
}

/**
 * @throws InvalidState
 */
function prepareWritableModels(models: CmeSemanticModel[]) {
  const result = filterWritableModels(models);
  if (result.length === 0) {
    LOG.error("There is no writable model.");
    throw new InvalidState();
  }
  return result;
}

/**
 * Select profiles, return array with noProfile when no profile is available.
 * @returns Non-empty array.
 */
function prepareProfiles<ProfileType extends EntityRepresentative>(
  availableProfiles: ProfileType[],
  profilIdentifiers: EntityDsIdentifier[],
  noProfile: ProfileType
): ProfileType[] {
  const result = availableProfiles
    .filter(item => profilIdentifiers.includes(item.identifier));
  if (result.length !== profilIdentifiers.length) {
    LOG.warn("Missing profiled representatives, some profiles were ignored.",
      { expected: profilIdentifiers, actual: result });
  }
  if (result.length === 0) {
    return [noProfile];
  } else {
    return result;
  }
}

/**
 * @return Relative IRI for the new profile.
 */
function prepareNewProfileIri<ProfileType extends EntityRepresentative>(
  language: string,
  languagePreferences: string[],
  generateIriFromName: (name: string) => string,
  profile: ProfileType,
): string {
  if (profile.iri === null) {
    // When there is no IRI we generate a new one.
    const name = languageStringToString(
      languagePreferences, language, profile.label);
    const relativeIri = generateIriFromName(name);
    return relativeIri;
  }
  if (isRelativeIri(profile.iri)) {
    return profile.iri;
  }
  return absoluteIriToRelative(profile.iri).relative;
}

/**
 * @returns Items that represent a profile.
 */
function filterProfiles<ProfileType extends EntityRepresentative>(
  items: ProfileType[]): ProfileType[] {
  return items.filter(item => item.profileOfIdentifiers.length > 0);
}

/**
 * Create a state for edit given entity.
 *
 * @param noProfile Value to use where no profile is available.
 * @param allSpecializations Possible specializations.
 * @param generalizations All generalization.
 * @throws InvalidState
 */
export function createEditBaseEntityProfileDialogState
  <ProfileType extends EntityRepresentative>(
  language: string,
  entityModels: Map<string, EntityModel>,
  allModels: CmeSemanticModel[],
  entity: CmeReference,
  allProfiles: ProfileType[],
  profileIdentifiers: EntityDsIdentifier[],
  noProfile: ProfileType,
  iri: string,
  name: LanguageString | null,
  nameSourceIdentifier: string | null,
  description: LanguageString | null,
  descriptionSourceIdentifier: string | null,
  externalDocumentationUrl: string,
  usageNote: LanguageString | null,
  usageNoteSourceIdentifier: string | null,
  allSpecializations: EntityRepresentative[],
): BaseEntityProfileDialogState<ProfileType> {

  const semanticModels: InMemorySemanticModel[] =
    [...entityModels.values()].filter(isInMemorySemanticModel);

  const writableModels = prepareWritableModels(allModels);
  const model = findByIdentifier(writableModels, entity.model);
  if (model === null) {
    LOG.error("Missing required model.",);
    throw new InvalidState();
  }

  const profiles = prepareProfiles(allProfiles, profileIdentifiers, noProfile);
  const availableUsageNoteSources = filterProfiles(profiles);
  if (availableUsageNoteSources.length === 0) {
    availableUsageNoteSources.push(noProfile);
  }

  const overrideName = nameSourceIdentifier === null;

  const nameSource =
    profiles.find(item => item.identifier === nameSourceIdentifier)
    ?? profiles[0];

  const overrideDescription = descriptionSourceIdentifier === null;

  const descriptionSource =
    profiles.find(item => item.identifier === descriptionSourceIdentifier)
    ?? profiles[0];

  const overrideUsageNote = usageNoteSourceIdentifier === null;

  const usageNoteSource =
    availableUsageNoteSources.find(item => item.identifier === usageNoteSourceIdentifier)
    ?? availableUsageNoteSources[0];

  const availableSpecializations = sanitizeDuplicitiesInRepresentativeLabels(
    allModels, allSpecializations
      .filter(item => item.model === model.identifier)
      .filter(item => item.identifier !== entity.identifier));
  sortRepresentatives(language, availableSpecializations);

  const availableProfiles = sanitizeDuplicitiesInRepresentativeLabels(
    allModels, allProfiles);
  sortRepresentatives(language, availableProfiles);

  console.log("createEditBaseEntityProfileDialogState", { description, descriptionSourceValue: descriptionSource.description });

  return {
    language,
    // Model
    allModels: allModels,
    availableModels: writableModels,
    model,
    disableModelChange: true,
    // IRI
    iri,
    isIriAutogenerated: false,
    isIriRelative: isRelativeIri(iri),
    iriValidation: validationNoProblem(),
    // Profile
    availableProfiles,
    profiles,
    noProfile,
    // Name
    name: (overrideName
      ? name : nameSource.label) ?? {},
    overrideName,
    nameSource,
    nameSourceValue: nameSource.label,
    hideNameProfile: profiles[0] === noProfile,
    // Description
    description: (overrideDescription
      ? description : descriptionSource.description) ?? {},
    overrideDescription,
    descriptionSource,
    descriptionSourceValue: descriptionSource.description,
    hideDescriptionProfile: profiles[0] === noProfile,
    // Usage note
    usageNote: (overrideUsageNote ?
      usageNote : usageNoteSource?.usageNote) ?? {},
    overrideUsageNote,
    usageNoteSource,
    usageNoteSourceValue: usageNoteSource?.usageNote ?? {},
    availableUsageNoteSources,
    hideUsageNoteProfile: availableUsageNoteSources[0] === noProfile,
    // Specialization
    allSpecializations,
    availableSpecializations,
    specializations: representSpecializations(
      entity.identifier, allSpecializations, semanticModels),
    //
    externalDocumentationUrl,
  };
}

function findByIdentifier<Type extends { identifier: string }>(
  items: Type[], identifier: string | null,
): Type | null {
  if (identifier === null) {
    return null;
  }
  return items.find(item => item.identifier === identifier) ?? null;
}

// Same function is in base-entity-dialog-state
function representSpecializations(
  identifier: string,
  allSpecializations: EntityRepresentative[],
  semanticModels: InMemorySemanticModel[],
): CmeSpecialization[] {
  const result: CmeSpecialization[] = []
  // We need to search for all generalizations.
  for (const model of semanticModels) {
    for (const entity of Object.values(model.getEntities())) {
      if (!isSemanticModelGeneralization(entity)) {
        continue;
      }
      if (entity.child !== identifier) {
        continue;
      }
      // Find the specialized entity.
      const specialized = allSpecializations
        .find(item => item.identifier === entity.parent);
      result.push({
        iri: entity.iri ?? "",
        specializationOf: {
          identifier: specialized?.identifier ?? entity.parent,
          model: specialized?.model ?? UNDEFINED_MODEL,
        },
        generalization: {
          identifier: entity.id,
          model: model.getId(),
        },
      });
    }
  }
  return result;
}
