import {
  ProfileClass,
  ProfileEntityRecord,
  ProfileGeneralization,
  ProfileRelationship,
} from "../profile-model.ts";

export interface ProfileModelMergePolicy {

  /**
   * @param assignmentEntities All ControlledVocabularyAssignment entities
   * being merged, keyed by id.
   */
  mergeClassProfile(
    left: ProfileClass,
    right: ProfileClass,
    assignmentEntities: ProfileEntityRecord,
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
