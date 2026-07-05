import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { HexColor, Position, VisualEntity, Waypoint } from "../index.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { VisualModelSerializationV2 } from "./serialization-v2.ts";

export interface VisualModelSerializationV1 {

  identifier: string;

  version: 1;

  type: "http://dataspecer.com/resources/local/visual-model";

  entities: VisualEntityV1[];

}

/**
 * In this version "identifier" was used for visual entities
 * instead of "id".
 */
export interface VisualEntityV1 {

  identifier: string;

  type: string[];

}

export interface VisualNodeV1 extends VisualEntityV1 {

  type: ["visual-node"];

  representedEntity: EntityIdentifier;

  model: ModelIdentifier;

  position: Position;

  content: string[];

  visualModels: string[];

}

export interface VisualRelationshipV1 extends VisualEntityV1 {

  type: ["visual-relationship"];

  representedRelationship: EntityIdentifier;

  model: ModelIdentifier;

  waypoints: Waypoint[];

  visualSource: EntityIdentifier;

  visualTarget: EntityIdentifier;

}

export interface VisualModelDataV1 extends VisualEntityV1 {

  type: ["http://dataspecer.com/resources/local/visual-model"];

  representedModel: string;

  color: HexColor | null;

}

export interface ModelEntityV1 extends VisualEntityV1 {

  type: ["entity-model-type"];

  label: LanguageString | null;

}

export function isVisualModelSerializationV1(
  what: any,
): what is VisualModelSerializationV1 {
  return what.version === 1
    || what.type === "http://dataspecer.com/resources/local/visual-model";
}

export function visualModelSerializationV1ToV2(
  serialization: VisualModelSerializationV1,
): VisualModelSerializationV2 {
  return {
    ...serialization,
    version: 2,
    // We just need to move "identifier" to "id".
    entities: serialization.entities.map(entity => {
      const next : any = {...entity};
      (next as any).id = entity.identifier;
      delete next["identifier"];
      return next as VisualEntity;
    }),
  }
}
