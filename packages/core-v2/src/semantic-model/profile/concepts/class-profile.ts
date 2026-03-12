import { Entity } from "../../../entity-model/index.ts";
import { SemanticModelEntity } from "../../concepts/index.ts";
import { NamedThingProfile } from "./named-thing-profile.ts";
import { Profile } from "./profile.ts";

export interface SemanticModelClassProfile extends SemanticModelEntity, Profile, NamedThingProfile {

  type: [typeof SEMANTIC_MODEL_CLASS_PROFILE];

  /**
   * Collections of IRIs tagging this resources.
   */
  tags: string[];

  /**
   * Optional ordering string for custom sorting of profiles.
   * Uses natural sort order, items without order are placed at the end.
   */
  order?: string | null;

}

export const SEMANTIC_MODEL_CLASS_PROFILE = "class-profile";

export function isSemanticModelClassProfile(entity: Entity | null): entity is SemanticModelClassProfile {
  return entity?.type.includes(SEMANTIC_MODEL_CLASS_PROFILE) ?? false;
}
