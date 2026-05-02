import { SemanticModelClassProfile } from "../concepts/class-profile.ts";
import {
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/relationship-profile.ts";

export interface AggregatedProfiledSemanticModelClass
  extends SemanticModelClassProfile {

  /**
   * List of IRIs of the original classes that were referenced by the profile.
   */
  conceptIris: string[];

}

export interface AggregatedProfiledSemanticModelRelationship
  extends SemanticModelRelationshipProfile {

  ends: AggregatedProfiledSemanticModelRelationshipEnd[];

}

export interface AggregatedProfiledSemanticModelRelationshipEnd
  extends SemanticModelRelationshipEndProfile {

  /**
   * List of IRIs of the original ends that were referenced by the profile.
   */
  conceptIris: string[];

}
