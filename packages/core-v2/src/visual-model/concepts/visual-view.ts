import { Entity } from "../entity-model/entity.ts";
import { VisualEntity } from "./visual-entity.ts";

/**
 * We use this entity to store view options for the visual model.
 * For example we can store the initial viewport position.
 */
export interface VisualView extends VisualEntity {

    /**
     * Initial position to set for viewport.
     */
    initialPositions: {

        x: number;

        y: number;

    } | null;

}

export const VISUAL_VIEW_TYPE = "visual-view";

export function isVisualView(what: Entity): what is VisualView {
    return what.type.includes(VISUAL_VIEW_TYPE);
}
