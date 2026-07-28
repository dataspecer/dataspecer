import { ModelIdentifier } from "@dataspecer/core/model";
import {
    HexColor, VisualModelData, RepresentedEntityIdentifier, VisualEntity,
} from "./concepts/index.ts";
import { EntityIdentifier } from "@dataspecer/core/entity-model";

export enum VisualModelDataVersion {
    VERSION_0,
    /**
     * Changes from previous version:
     * - edges detected based on decimal position
     * - model assigned to UNKNOWN_MODEL
     */
    VERSION_1,
};

/**
 * Visual model is designed to allow users place a class, or profile, on a canvas.
 * This include, but is not limited to, associating position and color with an entity.
 *
 * Since the visual model capture what use see we design it as synchronous interface.
 */
export interface VisualModel {

    /**
     * @returns Model identifier.
     */
    getIdentifier(): ModelIdentifier;

    getTypes(): string[];

    /**
     * @returns Visual entity with given identifier or null.
     */
    getVisualEntity(identifier: EntityIdentifier): VisualEntity | null;

    /**
     * Return primary visual representations for given entity.
     * For example for a class profile returns VisualNode, not
     * VisualProfileRelationship.
     *
     * @returns Visual entities with given source entity identifier or empty array.
     */
    getVisualEntitiesForRepresented(represented: RepresentedEntityIdentifier): VisualEntity[];

    /**
     * @returns True if there exists at least one visual entity for the {@link represented}.
     */
    hasVisualEntityForRepresented(represented: RepresentedEntityIdentifier): boolean;

    /**
     * @returns Snapshot of map with all entities in the model.
     */
    getVisualEntities(): Map<EntityIdentifier, VisualEntity>;

    /**
     * Subscribe to changes.
     * @returns Callback to cancel the subscription.
     */
    subscribeToChanges(listener: VisualModelListener): () => void;

    /**
     * @returns Color as defined for given model or null.
     */
    getModelColor(identifier: ModelIdentifier): HexColor | null;

    /**
     * @returns All stored model data pairs.
     */
    getModelsData(): Map<ModelIdentifier, VisualModelData>;

    /**
     * We can use the version to perform higher level migration when needed.
     *
     * @returns Version of data content of this model was created from or latest version.
     */
    getInitialModelVersion(): VisualModelDataVersion;

    /**
     * @deprecated
     * @returns Model identifier.
     */
    getId(): string;

    /**
     * @deprecated
     * @returns JSON representation of model content to be send to backend.
     */
    serializeModel(): object;

    /**
     * Replace model content with value loaded from given JSON representation of the model.
     * @deprecated
     */
    deserializeModel(value: object): this;

    /**
     * @returns Get human readable label.
     */
    getLabel(): LanguageString | null;

    /**
     * @param label Human readable label for the model.
     */
    setLabel(label: LanguageString | null): void;

}

type LanguageString = { [language: string]: string };

export const VISUAL_MODEL_TYPE = "visual-model";

export function isVisualModel(what: unknown): what is VisualModel {
    return isTypedObject(what) && what.getTypes().includes(VISUAL_MODEL_TYPE);
}

function isTypedObject(what: unknown): what is { getTypes(): string[]; } {
    return typeof what === "object" && what !== null && "getTypes" in what;
}

/**
 * WARNING: The listeners are not triggered when model is changed
 * by deserialization!
 */
export interface VisualModelListener {

    /**
     * Argument's property previous is null when entity is created.
     * Argument's property next is null when entity is deleted.
     */
    visualEntitiesDidChange: (entities: {
        previous: VisualEntity | null,
        next: VisualEntity | null,
    }[]) => void;

    /**
     * Color is set to null, when the information about model color is removed.
     */
    modelColorDidChange: (
        identifier: ModelIdentifier, next: HexColor | null
    ) => void;

}
