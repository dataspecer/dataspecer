import { Entity } from "../../entity-model/entity.ts";
import { EntityModel } from "../../entity-model/entity-model.ts";
import { VisualEntity, VisualModel, isVisualModel } from "@dataspecer/visual-model";
import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP, SemanticModelClass, SemanticModelRelationship, isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "../concepts/index.ts";
import { SemanticEntityIdMerger, StrongerWinsSemanticEntityIdMerger } from "../merge/merger/index.ts";
import { createDefaultProfileEntityAggregator, ProfileEntityAggregator } from "../profile/aggregator/aggregator.ts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "../profile/concepts/index.ts";
import { SemanticModelClassUsage, SemanticModelRelationshipUsage, isSemanticModelClassUsage, isSemanticModelRelationshipUsage } from "../usage/concepts/index.ts";

/**
 * Object containing the result of the aggregation of an entity together with additional metadata, such as how the
 * aggregation was performed.
 */
export interface AggregatedEntityWrapper {
    /**
     * ID of the lowest entity in the chain of aggregation.
     */
    id: string;

    /**
     * All information combined from all models about the entity.
     */
    aggregatedEntity: Entity | null;

    /**
     * Raw entity as is from the model.
     */
    rawEntity: Entity | null;

    /**
     * List of direct sources that contributed to the aggregation of the entity.
     */
    sources: AggregatedEntityWrapper[];

    /**
     * Visual information about the entity that was obtained from the visual model.
     * There is no aggregation of visual entities as only one visual model can be present.
     *
     * @deprecated
     */
    visualEntities: VisualEntity[];
}

type SupportedModels = EntityModel | VisualModel;

type AggregatedModelSubscriber = (updated: AggregatedEntityWrapper[], removed: string[]) => void;

/**
 * Aggregates multiple models (the model graph] describing the semantics (concepts and their relations) into one.
 *
 * For example, we may have two semantic models, each with its own patches, merged together. The result is the
 * aggregation of the two models with their patches.
 */
interface SemanticModelAggregator {
    /**
     * Adds model describing the semantics to the aggregator.
     */
    addModel(model: SupportedModels): void;

    /**
     * Unregisters the model from the aggregator.
     */
    deleteModel(model: SupportedModels): void;

    /**
     * Returns the specific view.
     * @todo option to choose the view
     */
    getView(): SemanticModelAggregatorView;
}

interface EntityInModel {
    entity: Entity;
    model: SupportedModels;
}

class SemanticModelAggregatorInternal implements SemanticModelAggregator {
    /**
     * List of registered models in the aggregator.
     */
    models: Map<SupportedModels, () => void> = new Map();

    /**
     * Contains all entities from all models by their ID, merged together.
     */
    entityCache: Record<string, EntityInModel> = {};

    /**
     * Entities per model before merge.
     */
    entityCachePerModel: Map<SupportedModels, Record<string, EntityInModel>> = new Map();

    /**
     * Contains all entities that depend on the given entity by their ID.
     * The dependant entity (key) may not exist.
     */
    entityDependencyCache: Record<string, string[]> = {};

    /**
     * Contains calculated aggregated entities.
     */
    baseModelEntities: Record<string, AggregatedEntityWrapper> = {};

    baseModelSubscribers = new Set<AggregatedModelSubscriber>();

    /**
     * @deprecated
     */
    activeVisualModel: VisualModel | null = null;

    /**
     * Profile aggregator.
     */
    profileEntityAggregator: ProfileEntityAggregator =
        createDefaultProfileEntityAggregator();

    entityMerger: SemanticEntityIdMerger = new StrongerWinsSemanticEntityIdMerger();

    addModel(model: SupportedModels) {
        if (this.models.has(model)) {
            throw new Error("Model already added.");
        }

        if (isVisualModel(model)) {
            const unsubscribe = model.subscribeToChanges({
                modelColorDidChange() {
                    // Seems like we ignore this ... not sure why.
                },
                visualEntitiesDidChange() {
                    // Seems like we ignore this ... not sure why.
                },
            });
            this.models.set(model, unsubscribe);
            return;
        }

        this.entityCachePerModel.set(model, {});

        const callback = (updated: Record<string, Entity>, removed: string[]) => {
            if (!this.models.has(model)) {
                return;
            }

            const entities = Object.values(updated);

            // Suppose there is a model that joins them all. Then we need to inform it
            this.notifyBaseModel(model, entities, removed);
        };

        const unsubscribe = model.subscribeToChanges(callback);
        this.models.set(model, unsubscribe);
        callback(model.getEntities(), []);
    }

    deleteModel(model: SupportedModels) {
        const unsubscribe = this.models.get(model);
        if (!unsubscribe) {
            throw new Error("Given model has not been added to the aggregator and thus can not be deleted.");
        }

        this.models.delete(model);

        if (isVisualModel(model)) {
            if (this.activeVisualModel?.getIdentifier() == model.getIdentifier()) {
                this.setActiveVisualModel(
                    [...this.models.keys()].filter(isVisualModel).find((m) => m.getIdentifier() != model.getIdentifier()) ?? null
                );
            }
            return;
        }

        this.notifyBaseModel(model, [], Object.keys(model.getEntities()));
        this.entityCachePerModel.delete(model);
        // TODO: shouldn't `unsubscribe()` be called?
    }

    private getEntityDependencies(entity: Entity | null): string[] {
        if (entity === null) {
            return [];
        }

        if (isSemanticModelClassUsage(entity) || isSemanticModelRelationshipUsage(entity)) {
            return [entity.usageOf];
        }

        // Special handling of selected entity types.
        if (isSemanticModelClass(entity) || isSemanticModelRelationship(entity) || isSemanticModelGeneralization(entity)) {
            return [];
        }

        const profileDependencies = this.profileEntityAggregator.dependencies(entity);
        if (profileDependencies !== null) {
            return profileDependencies;
        }

        console.warn("Entity", entity.id, "has an unknown type", entity.type, ", and therefore the aggregator does not know its dependencies. The entity would be considered as standalone and not aggregated with other entities. This may lead to unexpected results if you expect something else.");
        return [];
    }

    private updateEntityCacheForId(id: string) {
        const entities = [...this.entityCachePerModel.values()].map(model => model[id]).filter(e => e) as EntityInModel[];
        if (entities.length === 0) {
            delete this.entityCache[id];
        } else if (entities.length === 1) {
            this.entityCache[id] = entities[0] as EntityInModel;
        } else { // More than one
            const firstEntity = entities[0] as EntityInModel;

            // We need to merge the entities
            if (isSemanticModelClass(firstEntity.entity)) {
                const merged = this.entityMerger.mergeClasses(entities.map(e => e.entity as SemanticModelClass));
                this.entityCache[id] = {
                    entity: merged,
                    model: firstEntity.model, // todo
                };
            } else if (isSemanticModelRelationship(firstEntity.entity)) {
                const merged = this.entityMerger.mergeRelationships(entities.map(e => e.entity as SemanticModelRelationship));
                this.entityCache[id] = {
                    entity: merged,
                    model: firstEntity.model, // todo
                };
            } else {
                // Don't know how to merge this...
                this.entityCache[id] = firstEntity;
            }
        }
    }

    /**
     * Temporary function that notifies base model about changes. We suppose that every model is a dependency of the base model.
     */
    private notifyBaseModel(fromModel: SupportedModels, updated: Entity[], removed: string[]) {
        // Aggregated entities that need to be updated
        const needsUpdate = [...updated.map((entity) => entity.id), ...removed];

        // Update entity cache
        for (const entity of updated) {
            this.entityCachePerModel.get(fromModel)![entity.id] = { entity, model: fromModel };
            this.updateEntityCacheForId(entity.id);
        }
        for (const id of removed) {
            delete this.entityCachePerModel.get(fromModel)![id];
            this.updateEntityCacheForId(id);
        }

        // Create dependency cache.
        // TODO: do it more efficiently
        this.entityDependencyCache = {};
        for (const entity of Object.values(this.entityCache)) {
            const dependencies = this.getEntityDependencies(entity.entity);
            for (const dependency of dependencies) {
                const cache = this.entityDependencyCache[dependency] = this.entityDependencyCache[dependency] ?? [];
                cache.push(entity.entity.id);
            }
        }

        // List of updated entities
        const updatedEntities: Record<string, AggregatedEntityWrapper> = {};

        let updatedEntity: string | undefined;
        while (updatedEntity = needsUpdate.pop()) {
            if (removed.includes(updatedEntity)) {
                delete this.baseModelEntities[updatedEntity];
            } else {
                const { entity, model } = this.entityCache[updatedEntity]!;

                if (isSemanticModelClassProfile(entity)) {
                    const dependencies = (this.profileEntityAggregator.dependencies(entity) ?? [])
                        .map(identifier => this.baseModelEntities[identifier])
                        .filter(item => item !== undefined);

                    const aggregatedDependencies =
                        dependencies.map(item => item.aggregatedEntity)
                            .filter(item => item !== null)
                            .filter(item => isSemanticModelClassProfile(item) || isSemanticModelClass(item));

                    this.baseModelEntities[updatedEntity] = {
                        id: updatedEntity,
                        aggregatedEntity: this.profileEntityAggregator.aggregateSemanticModelClassProfile(
                            entity, aggregatedDependencies),
                        rawEntity: entity,
                        sources: dependencies,
                        visualEntities: [],
                    };
                } else if (isSemanticModelRelationshipProfile(entity)) {
                    const dependencies = (this.profileEntityAggregator.dependencies(entity) ?? [])
                        .map(identifier => this.baseModelEntities[identifier])
                        .filter(item => item !== undefined);

                    const aggregatedDependencies =
                        dependencies.map(item => item.aggregatedEntity)
                            .filter(item => item !== null)
                            .filter(item => isSemanticModelRelationshipProfile(item) || isSemanticModelRelationship(item));

                    this.baseModelEntities[updatedEntity] = {
                        id: updatedEntity,
                        aggregatedEntity: this.profileEntityAggregator.aggregateSemanticModelRelationshipProfile(
                            entity, aggregatedDependencies),
                        rawEntity: entity,
                        sources: dependencies,
                        visualEntities: [],
                    };
                } else if (
                    isSemanticModelClassUsage(entity)
                ) {
                    const source = this.baseModelEntities[entity.usageOf];
                    const sourceEntity = source?.aggregatedEntity as SemanticModelClassUsage & SemanticModelClass | undefined;
                    const aggregatedEntity = {
                        ...sourceEntity,
                        ...entity,
                        name: entity.name ?? sourceEntity?.name ?? null,
                        description: entity.description ?? sourceEntity?.description ?? null,
                        usageNote: entity.usageNote ?? sourceEntity?.usageNote ?? null,
                    } as SemanticModelClassUsage & SemanticModelClass; // this is legal in the given context

                    this.baseModelEntities[updatedEntity] = {
                        id: updatedEntity,
                        aggregatedEntity: aggregatedEntity,
                        rawEntity: entity,
                        sources: source ? [source] : [],
                        visualEntities: [], // we do not have to deal with it
                    };
                } else if (
                    isSemanticModelRelationshipUsage(entity)
                ) {
                    const source = this.baseModelEntities[entity.usageOf];
                    const sourceEntity = source?.aggregatedEntity as SemanticModelRelationshipUsage & SemanticModelRelationship | undefined;
                    const aggregatedEntity = {
                        ...sourceEntity,
                        ...entity,
                        name: entity.name ?? sourceEntity?.name ?? null,
                        description: entity.description ?? sourceEntity?.description ?? null,
                        usageNote: entity.usageNote ?? sourceEntity?.usageNote ?? null,
                        ends: entity.ends.map((end, index) => {
                            const sourceEnd = sourceEntity?.ends[index];
                            return {
                                ...sourceEnd,
                                ...end,
                                name: end.name ?? sourceEnd?.name ?? null,
                                description: end.description ?? sourceEnd?.description ?? null,
                                cardinality: end.cardinality ?? sourceEnd?.cardinality ?? null,
                                concept: end.concept ?? sourceEnd?.concept ?? null,
                            };
                        }),
                    } as SemanticModelRelationshipUsage & SemanticModelRelationship;

                    this.baseModelEntities[updatedEntity] = {
                        id: updatedEntity,
                        aggregatedEntity: aggregatedEntity,
                        rawEntity: entity,
                        sources: source ? [source] : [],
                        visualEntities: [], // we do not have to deal with it
                    };
                } else {
                    if (
                        !entity.type.includes(SEMANTIC_MODEL_CLASS) &&
                        !entity.type.includes(SEMANTIC_MODEL_GENERALIZATION) &&
                        !entity.type.includes(SEMANTIC_MODEL_RELATIONSHIP)
                    ) {
                        console.warn("Entity", entity.id, "from model", model.getId(), "has an unknown type", entity.type, ", and therefore the aggregator does not know its dependencies. The entity would be considered as standalone and not aggregated with other entities. This may lead to unexpected results if you expect something else.");
                    }
                    this.baseModelEntities[updatedEntity] = {
                        id: updatedEntity,
                        aggregatedEntity: entity,
                        rawEntity: entity,
                        sources: [],
                        visualEntities: [], // we do not have to deal with it
                    };
                }

                updatedEntities[updatedEntity] = this.baseModelEntities[updatedEntity]!;
            }

            needsUpdate.push(...this.entityDependencyCache[updatedEntity] ?? []);
        }

        this.baseModelSubscribers.forEach((subscriber) => subscriber(Object.values(updatedEntities), removed));
    }

    getView(): SemanticModelAggregatorView {
        return new SemanticModelAggregatorView(this);
    }

    /**
     * @deprecated
     */
    setActiveVisualModel(toModel: string | VisualModel | null) {
        if (typeof toModel == "string") {
            const availableModels = [...this.models.keys()];
            this.activeVisualModel = availableModels.find((model) => (model as VisualModel)?.getId() == toModel) as VisualModel;
        } else {
            // Can be null or a real visual model.
            this.activeVisualModel = toModel;
        }
    }
}

// Necessary for exposing class internals for another class

const semanticModelAggregatorInternal = SemanticModelAggregatorInternal as new () => SemanticModelAggregator;
export { semanticModelAggregatorInternal as SemanticModelAggregator };

/**
 * Provides methods for reading the aggregated semantic model graph. Usually, we want the aggregation of the whole
 * graph, but sometimes it may be useful to get aggregation of only a subgraph. For example, instead of getting the
 * semantics with patches applied, we may want to get only the original semantics without the patches. Therefore,
 * multiple views can be created for the same aggregator, each for a different subgraph.
 */
export class SemanticModelAggregatorView {

    private readonly aggregator: SemanticModelAggregatorInternal;

    /**
     * @internal use {@link SemanticModelAggregator.getView} instead
     */
    constructor(aggregator: SemanticModelAggregatorInternal) {
        this.aggregator = aggregator;
    }

    /**
     * @returns Array of all models in the aggregator.
     */
    getModels(): SupportedModels[] {
        return [...this.aggregator.models.keys()];
    }

    /**
     * @returns Dictionary with all entities aggregated.
     */
    getEntities(): Record<string, AggregatedEntityWrapper> {
        const entities = { ...this.aggregator.baseModelEntities };
        // Just an optimization to not call it multiple times, when it is null.
        if (this.aggregator.activeVisualModel === null) {
            return entities;
        }
        for (const entity of Object.values(entities)) {
            entity.visualEntities = this.aggregator.activeVisualModel?.getVisualEntitiesForRepresented(entity.id) ?? [];
        };

        return entities;
    }

    /**
     * Subscribe to changes.
     * @param callback Function that will be called when the entities change with the updated entities
     * @returns Function that can be called to unsubscribe from changes
     */
    subscribeToChanges(callback: AggregatedModelSubscriber): () => void {
        // todo temporary
        if (this.aggregator.baseModelSubscribers.has(callback)) {
            throw new Error("Callback already subscribed.");
        }
        this.aggregator.baseModelSubscribers.add(callback);
        return () => this.aggregator.baseModelSubscribers.delete(callback);
    }

    /**
     * @deprecated
     */
    getActiveViewId() {
        return this.aggregator.activeVisualModel?.getIdentifier();
    }

    /**
     * @deprecated
     */
    getActiveVisualModel() {
        return this.aggregator.activeVisualModel;
    }

    /**
     * @deprecated
     */
    changeActiveVisualModel(identifier: string | null) {
        this.aggregator.setActiveVisualModel(identifier);
    }

    /**
     * @deprecated
     */
    getAvailableVisualModels(): VisualModel[] {
        return [...this.aggregator.models.keys()]
            .filter((m) => isVisualModel(m)) as VisualModel[];
    }

    /**
     * @deprecated
     */
    getAvailableVisualModelIds(): string[] {
        return [...this.aggregator.models.keys()]
            .filter((m) => isVisualModel(m))
            .map((m) => (m as VisualModel).getIdentifier());
    }

}
