import {
  ClassProfile,
  GeneralizationProfile,
  RelationshipProfile,
} from "../profile-model.ts";

export interface ProfileModelMergePolicy {

  mergeClassProfile(
    left: ClassProfile,
    right: ClassProfile,
  ): ClassProfile;

  mergeRelationshipProfile(
    left: RelationshipProfile,
    right: RelationshipProfile,
  ): RelationshipProfile;

  mergeGeneralizationProfile(
    left: GeneralizationProfile,
    right: GeneralizationProfile,
  ): GeneralizationProfile;

}
