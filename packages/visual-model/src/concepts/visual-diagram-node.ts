import { Entity } from "../entity-model/entity.ts";
import { Position } from "./position.ts";
import { VisualEntity } from "./visual-entity.ts";

/**
 * Represents a visual node, which represents {@link representedVisualModel}.
 */
export interface VisualDiagramNode extends VisualEntity {

    /**
     * Position on canvas.
     */
    position: Position,

    /**
     * Identifier of the visual model, which is represented by this visual node.
     */
    representedVisualModel: string,

}

export const VISUAL_DIAGRAM_NODE_TYPE = "visual-diagram-node";

export function isVisualDiagramNode(what: Entity): what is VisualDiagramNode {
    return what.type.includes(VISUAL_DIAGRAM_NODE_TYPE);
}
