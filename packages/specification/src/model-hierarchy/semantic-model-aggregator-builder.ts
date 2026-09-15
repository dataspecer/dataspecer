import {
  ApplicationProfileAggregator,
  EntityModel,
  ExternalModelWithCacheAggregator,
  getMainEntity,
  MergeAggregator,
  SemanticModelAggregator,
  VocabularyAggregator,
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { VisualModelData } from "@dataspecer/visual-model";
import { isApplicationProfileHierarchyEntity, isSpecificationHierarchyEntity, isVocabularyHierarchyEntity, type ModelHierarchyEntity, type ApplicationProfileHierarchyEntity } from "@dataspecer/model-hierarchy";
import { getProvidedSourceSemanticModel } from "./adapter.ts";

const DEFAULT_VOCABULARY_COLOR = "#f9aa49";
const DEFAULT_COLOR = "#4998f9";

/**
 * Build semantic model aggregator. If onChange is not provided, then the model
 * is static. Hierarchy changes require building a new aggregator.
 *
 * @param specificationId Identifier of the package to aggregate.
 * @param hierarchy Resolved hierarchy entities, including package specifications.
 * @param models Current semantic model contents.
 * @param onChange Subscribes to semantic model changes; returns an unsubscribe function.
 * @param executeOperation Forwards operations to the corresponding semantic model.
 * @returns Semantic model aggregator built from the hierarchy and model contents
 */
export function build(
  specificationId: ModelIdentifier,
  hierarchy: EntityRecord<ModelHierarchyEntity>,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
  executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
): SemanticModelAggregator {
  const builder = new SemanticModelAggregatorBuilder(specificationId, hierarchy, models, onChange, executeOperation);
  return builder.build();
}

/**
 * Wraps an {@link EntityRecord} as an {@link EntityModel}.
 *
 * Operations are not applied locally - they are only forwarded via
 * {@link executeOperation}. The model only updates once the resulting change
 * comes back through {@link onChange}.
 */
class EntityRecordModel implements EntityModel {
  private readonly modelId: ModelIdentifier;
  private readonly executeOperationCallback?: (modelId: ModelIdentifier, operation: any) => void;
  private readonly subscribers: ((changes: EntityChange[]) => void)[] = [];
  private entities: EntityRecord;

  constructor(
    modelId: ModelIdentifier,
    entities: EntityRecord,
    onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
    executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  ) {
    this.modelId = modelId;
    this.entities = entities;
    this.executeOperationCallback = executeOperation;

    onChange?.((changes) => {
      const modelChanges = changes[this.modelId];
      if (!modelChanges || modelChanges.length === 0) {
        return;
      }
      this.applyChanges(modelChanges);
      for (const subscriber of this.subscribers) {
        subscriber(modelChanges);
      }
    });
  }

  private applyChanges(changes: EntityChange[]): void {
    const entities = { ...this.entities };
    for (const change of changes) {
      if (change.next) {
        entities[change.next.id] = change.next;
      } else if (change.previous) {
        delete entities[change.previous.id];
      }
    }
    this.entities = entities;
  }

  getEntities(): EntityRecord {
    return this.entities;
  }

  subscribeToChanges(callback: (changes: EntityChange[]) => void): void {
    this.subscribers.push(callback);
  }

  executeOperation(operation: any): void {
    this.executeOperationCallback?.(this.modelId, operation);
  }
}

/**
 * Builder for semantic model aggregators
 */
class SemanticModelAggregatorBuilder {
  private readonly hierarchy: EntityRecord<ModelHierarchyEntity>;
  private readonly allModels: Record<ModelIdentifier, EntityRecord>;
  private readonly onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void;
  private readonly executeOperation?: (modelId: ModelIdentifier, operation: any) => void;
  private readonly aggregators: Record<ModelIdentifier, SemanticModelAggregator> = {};
  private readonly building = new Set<ModelIdentifier>();
  private knownModels: Record<string, EntityModel> = {};
  private modelData: Record<string, VisualModelData> = {};

  constructor(
    private readonly specificationId: ModelIdentifier,
    hierarchy: EntityRecord<ModelHierarchyEntity>,
    allModels: Record<ModelIdentifier, EntityRecord>,
    onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
    executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  ) {
    this.hierarchy = hierarchy;
    this.allModels = allModels;
    this.onChange = onChange;
    this.executeOperation = executeOperation;
  }

  /**
   * Main entry point: builds the aggregator for the root package
   */
  build(): SemanticModelAggregator {
    this.knownModels = {};
    this.modelData = {};
    const specification = this.hierarchy[this.specificationId];
    if (!isSpecificationHierarchyEntity(specification)) {
      throw new Error(`Specification '${this.specificationId}' not found in the hierarchy.`);
    }
    const roots: ModelIdentifier[] = [];
    if (specification.applicationProfile !== null) {
      if (!isApplicationProfileHierarchyEntity(this.hierarchy[specification.applicationProfile])) {
        throw new Error(`Model '${specification.applicationProfile}' is not an application profile in the hierarchy.`);
      }
      roots.push(specification.applicationProfile);
    }
    for (const modelId of specification.vocabularies) {
      if (!isVocabularyHierarchyEntity(this.hierarchy[modelId])) {
        throw new Error(`Model '${modelId}' is not a vocabulary in the hierarchy.`);
      }
      roots.push(modelId);
    }
    return this.mergeIfNecessary(roots.map((modelId) => this.buildModel(modelId)));
  }

  private buildModel(modelId: ModelIdentifier): SemanticModelAggregator {
    if (this.aggregators[modelId]) {
      return this.aggregators[modelId];
    }
    const entity = this.hierarchy[modelId];
    if (!entity) {
      throw new Error(`Model '${modelId}' not found in the hierarchy.`);
    }
    if (this.building.has(modelId)) {
      throw new Error(`Cyclic model hierarchy at '${modelId}'.`);
    }
    this.building.add(modelId);

    let aggregator: SemanticModelAggregator;
    if (isApplicationProfileHierarchyEntity(entity)) {
      const applicationProfiles = new Set(entity.profiles.filter((id) => isApplicationProfileHierarchyEntity(this.hierarchy[id])));
      if (applicationProfiles.size > 1) {
        throw new Error(`Application profile '${modelId}' cannot merge multiple application profiles.`);
      }
      const profiles = this.mergeIfNecessary(entity.profiles.map((id) => this.buildModel(id)));
      aggregator = this.buildApplicationProfile(modelId, profiles, entity);
      if (entity.passThrough) {
        aggregator = new MergeAggregator([aggregator, profiles]);
      }
    } else if (isVocabularyHierarchyEntity(entity)) {
      aggregator = this.buildVocabulary(modelId);
      if (entity.passThrough && entity.imports.length > 0) {
        aggregator = new MergeAggregator([aggregator, ...entity.imports.map((id) => this.buildModel(id))]);
      }
    } else {
      throw new Error(`Model '${modelId}' is not a vocabulary or application profile.`);
    }

    this.building.delete(modelId);
    this.aggregators[modelId] = aggregator;
    return aggregator;
  }

  /**
   * Get or create a semantic model wrapper for the given model ID
   */
  private getSemanticModel(modelId: string): EntityModel {
    if (this.knownModels[modelId]) {
      return this.knownModels[modelId];
    }

    const entities = this.allModels[modelId];
    if (!entities) {
      throw new Error(`Model '${modelId}' has no loaded entities.`);
    }
    const model = new EntityRecordModel(modelId, entities, this.onChange, this.executeOperation);

    this.knownModels[modelId] = model;
    return model;
  }

  private buildApplicationProfile(
    modelId: ModelIdentifier,
    profiles: SemanticModelAggregator,
    configuration: ApplicationProfileHierarchyEntity,
  ): SemanticModelAggregator {
    const aggregator = new ApplicationProfileAggregator(this.getSemanticModel(modelId), profiles, true)
      .setCanAddEntities(configuration.canAddEntities)
      .setCanModify(configuration.canModify);
    (aggregator.thisVocabularyChain as any)["color"] = this.modelData[modelId]?.color ?? DEFAULT_COLOR;
    return aggregator;
  }

  private buildVocabulary(modelId: ModelIdentifier): SemanticModelAggregator {
    const model = this.getSemanticModel(modelId);
    const mainEntity = getMainEntity(model.getEntities()) as Record<string, unknown> | null;

    if (mainEntity?.["caches"]) {
      const cimAdapter = getProvidedSourceSemanticModel(mainEntity["caches"] as any[]);
      const aggregator = new ExternalModelWithCacheAggregator(model, cimAdapter);
      (aggregator.thisVocabularyChain as any)["color"] = this.modelData[modelId]?.color ?? DEFAULT_VOCABULARY_COLOR;
      return aggregator;
    }

    const aggregator = new VocabularyAggregator(model);
    (aggregator.thisVocabularyChain as any)["color"] = this.modelData[modelId]?.color ?? DEFAULT_VOCABULARY_COLOR;
    return aggregator;
  }

  /**
   * Merge multiple aggregators into one, or return single if only one provided
   */
  private mergeIfNecessary(aggregators: SemanticModelAggregator[]): SemanticModelAggregator {
    if (aggregators.length === 0) {
      throw new Error("Cannot merge zero aggregators");
    }
    if (aggregators.length === 1) {
      return aggregators[0]!;
    }
    return new MergeAggregator(aggregators);
  }
}
