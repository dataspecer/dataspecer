import {
  ProfileClass,
  ProfileGeneralization,
  ProfileRelationship,
} from "../profile-model.ts";

export interface ProfileModelMergePolicy {

  mergeClassProfile(
    left: ProfileClass,
    right: ProfileClass,
  ): ProfileClass;

  mergeRelationshipProfile(
    left: ProfileRelationship,
    right: ProfileRelationship,
  ): ProfileRelationship;

  mergeGeneralizationProfile(
    left: ProfileGeneralization,
    right: ProfileGeneralization,
  ): ProfileGeneralization;

}
