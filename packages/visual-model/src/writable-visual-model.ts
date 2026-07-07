import { EntityIdentifier } from "@dataspecer/core/entity-model";
import {
    HexColor,
    VisualEntity,
    VisualGroup,
    VisualNode,
    VisualProfileRelationship,
    VisualRelationship,
    VisualDiagramNode,
    VisualView,
} from "./concepts/index.ts";
import { isVisualModel, VisualModel } from "./visual-model.ts";
import { ModelIdentifier } from "@dataspecer/core/model";

export interface WritableVisualModel extends VisualModel {

    /**
     * @returns Identifier for the new entity.
     */
    addVisualNode(
        entity: Omit<VisualNode, "id" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualDiagramNode(
        entity: Omit<VisualDiagramNode, "id" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualRelationship(
        entity: Omit<VisualRelationship, "id" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualProfileRelationship(
        entity: Omit<VisualProfileRelationship, "id" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualGroup(entity: Omit<VisualGroup, "id" | "type">): string;

    /**
     * Perform update of a visual entity with given identifier.
     */
    updateVisualEntity<T extends VisualEntity>(
        identifier: EntityIdentifier,
        entity: Partial<Omit<T, "id" | "type">>,
    ): void;

    /**
     * Delete entity with given identifier.
     */
    deleteVisualEntity(identifier: EntityIdentifier): void;

    /**
     * Set color for given model.
     */
    setModelColor(identifier: ModelIdentifier, color: HexColor): void;

    /**
     * Delete stored information about color for given model.
     */
    deleteModelColor(identifier: ModelIdentifier): void;

    /**
     * Delete all stored information about the model.
     */
    deleteModelData(identifier: ModelIdentifier): void;

    /**
     * Set visual view information, this can be set only once
     * for a given visual model.
     */
    setView(view: Omit<VisualView, "id" | "type">): void;

}

export const WRITABLE_VISUAL_MODEL_TYPE = "writable-visual-model";

export function isWritableVisualModel(
    what: unknown,
): what is WritableVisualModel {
    return isVisualModel(what)
        && what.getTypes().includes(WRITABLE_VISUAL_MODEL_TYPE);
}
