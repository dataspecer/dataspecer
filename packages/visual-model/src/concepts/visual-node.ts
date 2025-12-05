import { Entity, EntityIdentifier } from "../entity-model/entity.ts";
import { ModelIdentifier } from "../entity-model/entity-model.ts";
import { VisualEntity } from "./visual-entity.ts";
import { Position } from "./position.ts";

/**
 * Represents an entity, i.g. class or a profile.
 */
export interface VisualNode extends VisualEntity {

    /**
     * Identifier of represented entity.
     */
    representedEntity: EntityIdentifier;

    /**
     * Identifier of the entity model the represented entity belongs to.
     */
    model: ModelIdentifier;

    /**
     * Position on canvas.
     */
    position: Position;

    /**
     * Identifiers of non-visual relationships, e.g. attributes,
     * to show as a part of the entity.
     */
    content: string[];

    /**
     * List of linked visual models assigned to this entity as its an
     * internal representation. In other words, diagrams that are assigned
     * to this visual entity as representative diagrams.
     */
    visualModels: string[];

}

export const VISUAL_NODE_TYPE = "visual-node";

export function isVisualNode(what: Entity): what is VisualNode {
    return what.type.includes(VISUAL_NODE_TYPE);
}
