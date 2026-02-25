import { isSemanticModelClass, isSemanticModelRelationship, SemanticModelClass, SemanticModelRelationship } from "../semantic-model/concepts/index.ts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../semantic-model/profile/concepts/index.ts";
import { isAggregatedEntityInApplicationProfileAggregator } from "./application-profile-aggregator.ts";
import { LocalEntityWrapped } from "./interfaces.ts";

type UnProfile<T extends SemanticModelClass | SemanticModelClassProfile | SemanticModelRelationship | SemanticModelRelationshipProfile> = (T extends SemanticModelClassProfile ? (SemanticModelClass) : (T extends SemanticModelRelationshipProfile ? SemanticModelRelationship : never)) | T;

function asSet<T>(arr?: T[]): T[] {
  return [...new Set(arr ?? [])];
}

/**
 * Takes aggregated profile and returns aggregated profiles that are closest to the profile but represent single concept.
 */
export function splitProfileToSingleConcepts<T extends SemanticModelClass | SemanticModelClassProfile | SemanticModelRelationship | SemanticModelRelationshipProfile>(profile: LocalEntityWrapped<T>): LocalEntityWrapped<UnProfile<T>>[] {
  // If not profile, return as is
  if ( // ! we expect you wont mix classes and relationships in the profile
    (
      isSemanticModelClass(profile.aggregatedEntity) &&
      !isSemanticModelClassProfile(profile.aggregatedEntity)
    ) || (
      isSemanticModelRelationship(profile.aggregatedEntity) &&
      !isSemanticModelRelationshipProfile(profile.aggregatedEntity)
    )
  ) {
    return [profile as LocalEntityWrapped<T>];
  }

  // If profile, return only if single iri
  if (isSemanticModelClassProfile(profile.aggregatedEntity)) {
    // @ts-ignore todo
    if (asSet(profile.aggregatedEntity["conceptIris"]).length === 1) {
      return [profile as LocalEntityWrapped<T>];
    }
  }
  if (isSemanticModelRelationshipProfile(profile.aggregatedEntity)) {
    // @ts-ignore todo
    if (profile.aggregatedEntity.ends.every(end => asSet(end["conceptIris"]).length <= 1) ) {
      return [profile as LocalEntityWrapped<T>];
    }
  }

  if (isAggregatedEntityInApplicationProfileAggregator(profile)) {
    // @ts-ignore
    return profile.sources.map(source => splitProfileToSingleConcepts(source as LocalEntityWrapped<UnProfile<T>>)).flat();
  }

  throw new Error("Not a profile we can split.");
}