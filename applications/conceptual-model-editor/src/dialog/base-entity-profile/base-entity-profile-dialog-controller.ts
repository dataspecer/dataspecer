import { createLogger } from "../../application";
import { EntityDsIdentifier, LanguageString } from "../../dataspecer/entity-model";
import { removeFromArray } from "../../utilities/functional";
import {
  createBaseEntityDialogController,
  BaseEntityDialogController,
} from "../base-entity/base-entity-dialog-controller";
import { EntityRepresentative } from "../utilities/dialog-utilities";
import { BaseEntityProfileDialogState } from "./base-entity-profile-dialog-state";

const LOG = createLogger(import.meta.url);

type SetLanguageString = (value: LanguageString) => LanguageString;

export interface BaseEntityProfileDialogController<
  ProfileType extends EntityRepresentative,
> extends BaseEntityDialogController {

  addProfile: (value: string) => void;

  removeProfile: (value: ProfileType) => void;

  toggleNameOverride: () => void;

  setNameSource: (value: ProfileType) => void;

  toggleDescriptionOverride: () => void;

  setDescriptionSource: (value: ProfileType) => void;

  setUsageNote: (setter: SetLanguageString) => void;

  toggleUsageNoteOverride: () => void;

  setUsageNoteSource: (value: ProfileType) => void;

  setOrder: (value: string) => void;

}

export function createBaseEntityProfileDialogController<
  ProfileType extends EntityRepresentative,
  StateType extends BaseEntityProfileDialogState<ProfileType>>(
  changeState: (next: StateType | ((prevState: StateType) => StateType)) => void,
  generateIriFromName: (name: string) => string,
): BaseEntityProfileDialogController<ProfileType> {

  const entityController = createBaseEntityDialogController(
    changeState, generateIriFromName);

  const toggleNameOverride = () => changeState(state => {
    const result = {
      ...state,
      overrideName: !state.overrideName,
    };
    // The nameSource could be noProfile.
    // As toggle back to inherit, there must be other profile to use.
    if (!result.overrideName && result.nameSource === result.noProfile) {
      result.nameSource = result.profiles[0];
      result.nameSourceValue = result.nameSource.label;
    }
    return result;
  });

  const setNameSource = (value: ProfileType) => changeState(state => ({
    ...state,
    nameSource: value,
    nameSourceValue: value.label,
  }));

  const toggleDescriptionOverride = () => changeState(state => {
    const result = {
      ...state,
      overrideDescription: !state.overrideDescription,
    };
    // The descriptionSource could be noProfile.
    // As toggle back to inherit, there must be other profile to use.
    if (!result.overrideDescription && result.descriptionSource === result.noProfile) {
      result.descriptionSource = result.profiles[0];
      result.descriptionSourceValue = result.descriptionSource.label;
    }
    return result;
  });

  const setDescriptionSource = (value: ProfileType) => changeState(state => ({
    ...state,
    descriptionSource: value,
    descriptionSourceValue: value.description,
  }));

  const setUsageNote = (setter: SetLanguageString) => changeState(state => ({
    ...state,
    usageNote: setter(state.usageNote),
  }));

  const toggleUsageNoteOverride = () => changeState(state => {
    const result = {
      ...state,
      overrideUsageNote: !state.overrideUsageNote,
    };
    // The usageNoteSource could be noProfile.
    // As toggle back to inherit, there must be other profile to use.
    if (!result.overrideUsageNote && result.usageNoteSource === result.noProfile) {
      result.usageNoteSource = result.availableUsageNoteSources[0];
      result.usageNoteSourceValue = result.usageNoteSource.usageNote ?? {};
    }
    return result;
  });

  const setUsageNoteSource = (value: ProfileType) => changeState(state => ({
    ...state,
    usageNoteSource: value,
    usageNoteSourceValue: value.usageNote,
  }));

  const setOrder = (value: string) => changeState(state => ({
    ...state,
    order: value,
  }));

  return {
    ...entityController,
    addProfile: (value) => changeState(state => addProfile(state, value)),
    removeProfile: (value) => changeState(state => removeProfile(state, value)),
    toggleNameOverride,
    setNameSource,
    toggleDescriptionOverride,
    setDescriptionSource,
    setUsageNote,
    toggleUsageNoteOverride,
    setUsageNoteSource,
    setOrder,
  };
}

function addProfile<
  ProfileType extends EntityRepresentative,
  StateType extends BaseEntityProfileDialogState<ProfileType>
>(
  state: StateType,
  value: string,
): StateType {
  const profile = findProfile(state.availableProfiles, value);
  if (profile === null) {
    LOG.error("New profile ignored, as there is no representative.",
      { identifier: value, value: state.availableProfiles });
    return state;
  }
  const result = {
    ...state,
    profiles: addProfileToProfiles(state.profiles, state.noProfile, profile),
  };
  // If this is the first profile besides the no profile,
  // we need to do some house keeping.
  if (result.nameSource === result.noProfile) {
    result.nameSource = profile;
    result.nameSourceValue = profile.label;
  }
  if (result.descriptionSource === result.noProfile) {
    result.descriptionSource = profile;
    result.descriptionSourceValue = profile.label;
  }
  const isProfile = profile.profileOfIdentifiers.length > 0;
  if (isProfile) {
    result.availableUsageNoteSources = addProfileToProfiles(
      result.availableUsageNoteSources, result.noProfile, profile);
    if (result.usageNoteSource === result.noProfile) {
      result.usageNoteSource = profile;
      result.usageNoteSourceValue = profile.label;
    }

  }
  // Visibility, since something was added we can show almost all.
  result.hideNameProfile = false;
  result.hideDescriptionProfile = false;
  result.hideUsageNoteProfile =
    result.availableUsageNoteSources[0] === result.noProfile;
  return result;
}

function findProfile<ProfileType extends EntityRepresentative>(
  availableProfiles: ProfileType[],
  identifier: EntityDsIdentifier,
): ProfileType | null {
  return availableProfiles.find(item => item.identifier === identifier) ?? null;
}

/**
 * If profiles contains only noProfile, return array with profile.
 * Else return array with added profile.
 */
function addProfileToProfiles<ProfileType extends EntityRepresentative>(
  profiles: ProfileType[], noProfile: ProfileType, profile: ProfileType,
): ProfileType[] {
  if (profiles.length === 1 && profiles[0] === noProfile) {
    return [profile];
  }
  return [...profiles, profile];
}

function removeProfile<
  ProfileType extends EntityRepresentative,
  StateType extends BaseEntityProfileDialogState<ProfileType>
>(
  state: StateType,
  value: ProfileType,
): StateType {
  const result = {
    ...state,
    profiles: removeProfileToProfiles(
      state.profiles, state.noProfile, value),
    availableUsageNoteSources: removeProfileToProfiles(
      state.availableUsageNoteSources, state.noProfile, value),
  };
  // We need to update state that depends on the profiles.
  if (!result.profiles.includes(result.nameSource)) {
    result.name = result.nameSourceValue;
    result.overrideName = true;
    result.nameSource = result.noProfile;
    result.nameSourceValue = result.noProfile.label;
  }
  if (!result.profiles.includes(result.descriptionSource)) {
    result.description = result.descriptionSourceValue;
    result.overrideDescription = true;
    result.descriptionSource = result.noProfile;
    result.descriptionSourceValue = result.noProfile.label;
  }
  if (!result.availableUsageNoteSources.includes(result.usageNoteSource)) {
    result.usageNote = result.usageNoteSourceValue;
    result.overrideUsageNote = true;
    result.usageNoteSource = result.noProfile;
    result.usageNoteSourceValue = result.noProfile.usageNote ?? {};
  }
  // Visibility.
  result.hideNameProfile = result.profiles[0] === result.noProfile;
  result.hideDescriptionProfile = result.profiles[0] === result.noProfile;
  result.hideUsageNoteProfile =
    result.availableUsageNoteSources[0] === result.noProfile;

  return result;
}

/**
 * Remove profile from profiles.
 * If the new profiles is empty return array with noProfile.
 */
function removeProfileToProfiles<ProfileType extends EntityRepresentative>(
  profiles: ProfileType[], noProfile: ProfileType, profile: ProfileType,
): ProfileType[] {
  const result = removeFromArray(profile, profiles);
  if (result.length === 0) {
    return [noProfile];
  }
  return result;
}
