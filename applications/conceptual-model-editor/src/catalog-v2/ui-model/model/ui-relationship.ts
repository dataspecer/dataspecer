import { UiEntity } from "./ui-entity";
import { UiCardinality } from "./ui-cardinality";

export const UI_RELATIONSHIP_TYPE = "ui-Relationship-type";

export interface UiRelationship extends UiEntity {

  type: typeof UI_RELATIONSHIP_TYPE;

  domain: UiEntity;

  domainCardinality: UiCardinality | null;

  range: UiEntity;

  rangeCardinality: UiCardinality | null;

}

export function isUiRelationship(
  entity: UiEntity | null,
): entity is UiRelationship {
  return entity?.type === UI_RELATIONSHIP_TYPE;
}
