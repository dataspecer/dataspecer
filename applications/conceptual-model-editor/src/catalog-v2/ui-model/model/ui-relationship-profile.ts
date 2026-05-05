import { UiEntity } from "./ui-entity";
import { UiReference } from "./ui-reference";
import { UiCardinality } from "./ui-cardinality";
import { CmeRelationshipProfileMandatoryLevel } from "../../../dataspecer/cme-model";

export const UI_RELATIONSHIP_PROFILE_TYPE = "ui-Relationship-profile-type";

export interface UiRelationshipProfile extends UiEntity {

  type: typeof UI_RELATIONSHIP_PROFILE_TYPE;

  /**
   * As profiles can create cycle we store them as references.
   */
  profiling: UiReference[];

  usageNote: string;

  domain: UiEntity;

  domainCardinality: UiCardinality | null;

  range: UiEntity;

  rangeCardinality: UiCardinality | null;

  mandatoryLevel: CmeRelationshipProfileMandatoryLevel | null;

}

export function isUiRelationshipProfile(
  entity: UiEntity | null,
): entity is UiRelationshipProfile {
  return entity?.type === UI_RELATIONSHIP_PROFILE_TYPE;
}
