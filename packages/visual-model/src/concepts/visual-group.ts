import { Entity } from "../entity-model/entity.ts";
import { VisualEntity } from "./visual-entity.ts";

export interface VisualGroup extends VisualEntity {

    /**
     * Used by layout algorithm to express desire of user
     * to not move the element.
     */
    anchored: true | null;

    /**
     * Identifiers of visual entities in this group.
     * A group can contain other groups.
     */
    content: string[];

}

export const VISUAL_GROUP_TYPE = "visual-group";

export function isVisualGroup(what: Entity): what is VisualGroup {
    return what.type.includes(VISUAL_GROUP_TYPE);
}
