import { Entity, EntityIdentifier } from "../entity-model/entity.ts";
import { HexColor } from "./color.ts";
import { VisualEntity } from "./visual-entity.ts";

/**
 * Contain visual information about a model of choice.
 */
export interface VisualModelData extends VisualEntity {

    /**
     * Identifier of the model.
     */
    representedModel: string;

    color: HexColor | null;

}

export const VISUAL_MODEL_DATA_TYPE =
    "http://dataspecer.com/resources/local/visual-model";

export function isModelVisualInformation(
    what: Entity,
): what is VisualModelData {
    return what.type.includes(VISUAL_MODEL_DATA_TYPE);
}

export function createVisualModelData(
    value: {
        identifier: EntityIdentifier,
        representedModel: string;
        color: HexColor | null;
    },
): VisualModelData {
    return {
        ...value,
        type: [VISUAL_MODEL_DATA_TYPE],
    }
}
