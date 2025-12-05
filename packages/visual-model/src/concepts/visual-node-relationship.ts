import { ModelIdentifier } from "../entity-model/entity-model.ts";
import { EntityIdentifier } from "../entity-model/entity.ts";
import { VisualEntity } from "./visual-entity.ts";
import { Waypoint } from "./waypoint.ts";

/**
 * Represents a relationship that is defined by an entity and its property.
 * Since we also need to capture a type of property this relations
 * is defined with we use sub-classes.
 *
 * This interface should not be used directly, it only servers
 * as a base-interface.
 */
export interface VisualNodeRelationship extends VisualEntity {

    /**
     * Identifier of entity facilitating the relationship.
     */
    entity: EntityIdentifier;

    /**
     * Identifier of the entity model the entity belongs to.
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
