import { ModelIdentifier } from "../entity-model/entity-model.ts";
import { Entity, EntityIdentifier } from "../entity-model/entity.ts";
import { VisualEntity } from "./visual-entity.ts";
import { Waypoint } from "./waypoint.ts";

/**
 * Represent a binary relationship that should be visible as a connection.
 */
export interface VisualRelationship extends VisualEntity {

    /**
     * Identifier of represented entity.
     */
    representedRelationship: EntityIdentifier;

    /**
     * Identifier of the entity model the represented relationship belongs to.
     */
    model: ModelIdentifier;

    /**
     * Order of waypoints is defined by the order in the array.
     */
    waypoints: Waypoint[];

    /**
     * Source visual entity.
     */
    visualSource: EntityIdentifier;

    /**
     * Target visual entity.
     */
    visualTarget: EntityIdentifier;

}

export const VISUAL_RELATIONSHIP_TYPE = "visual-relationship";

export function isVisualRelationship(what: Entity): what is VisualRelationship {
    return what.type.includes(VISUAL_RELATIONSHIP_TYPE);
}
