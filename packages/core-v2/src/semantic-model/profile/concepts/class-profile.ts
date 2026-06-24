import { Entity } from "../../../entity-model/index.ts";
import { SemanticModelEntity } from "../../concepts/index.ts";
import { NamedThingProfile } from "./named-thing-profile.ts";
import { Profile } from "./profile.ts";
import { OrderedThing } from "../../concepts/ordered-thing.ts";

export interface SemanticModelClassProfile extends SemanticModelEntity, Profile, NamedThingProfile, OrderedThing {

  type: [typeof SEMANTIC_MODEL_CLASS_PROFILE];

  /**
   * Collections of IRIs tagging this resources.
   */
  tags: string[];

  controlledVocabularies: ControlledVocabularyAssignment[] | undefined
}
//TODO: agregacni funkce


export type Qualifier = "MUST" | "AT_LEAST_1" | "RECOMMENDED" | "MAY"

export type ControlledVocabularyAssignment = {
    vocabularyId: string;
    qualifier: Qualifier;
    override: boolean; // co kdyz zmizi predek, rozlisit z ktereho predka?
}

export const SEMANTIC_MODEL_CLASS_PROFILE = "class-profile";

export function isSemanticModelClassProfile(entity: Entity | null): entity is SemanticModelClassProfile {
  return entity?.type.includes(SEMANTIC_MODEL_CLASS_PROFILE) ?? false;
}
