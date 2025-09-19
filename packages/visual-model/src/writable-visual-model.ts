import { EntityIdentifier } from "./entity-model/entity.ts";
import { ModelIdentifier } from "./entity-model/entity-model.ts";
import { isTypedObject } from "./entity-model/typed-object.ts";
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
import { VisualModel } from "./visual-model.ts";

export interface WritableVisualModel extends VisualModel {

    /**
     * @returns Identifier for the new entity.
     */
    addVisualNode(
        entity: Omit<VisualNode, "identifier" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualDiagramNode(
        entity: Omit<VisualDiagramNode, "identifier" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualRelationship(
        entity: Omit<VisualRelationship, "identifier" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualProfileRelationship(
        entity: Omit<VisualProfileRelationship, "identifier" | "type">,
    ): string;

    /**
     * @returns Identifier for the new entity.
     */
    addVisualGroup(entity: Omit<VisualGroup, "identifier" | "type">): string;

    /**
     * Perform update of a visual entity with given identifier.
     */
    updateVisualEntity<T extends VisualEntity>(
        identifier: EntityIdentifier,
        entity: Partial<Omit<T, "identifier" | "type">>,
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
    setView(view: Omit<VisualView, "identifier" | "type">): void;

}

export const WRITABLE_VISUAL_MODEL_TYPE = "writable-visual-model";

export function isWritableVisualModel(
    what: unknown,
): what is WritableVisualModel {
    return isTypedObject(what)
        && what.getTypes().includes(WRITABLE_VISUAL_MODEL_TYPE);
}
