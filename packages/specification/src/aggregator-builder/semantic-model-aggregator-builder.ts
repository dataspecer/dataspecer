import {
  ApplicationProfileAggregator,
  EntityModel,
  ExternalModelWithCacheAggregator,
  getMainEntity,
  MergeAggregator,
  SemanticModelAggregator,
  VocabularyAggregator,
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { isApplicationProfileHierarchyEntity, isSpecificationHierarchyEntity, isVocabularyHierarchyEntity, type ModelHierarchyEntity, type SpecificationHierarchyEntity } from "@dataspecer/model-hierarchy";
import { getProvidedSourceSemanticModel } from "./cim-adapter.ts";

const DEFAULT_VOCABULARY_COLOR = "#f9aa49";
const DEFAULT_COLOR = "#4998f9";

/** Options controlling specification pass-through and root-profile permissions. */
export interface SemanticModelAggregatorBuilderOptions {
  /** Includes local vocabularies and external dependencies in the root output. */
  forcePassThrough?: boolean;
  /** Allows adding entities to the root specification's profile. */
  canAddEntities?: boolean;
  /** Allows modifying the root specification's profile. */
  canModify?: boolean;
}

/**
 * Build semantic model aggregator. If onChange is not provided, then the model
 * is static. Hierarchy changes require building a new aggregator.
 *
 * @param specificationId Identifier of the package to aggregate.
 * @param hierarchy Resolved hierarchy entities, including package specifications.
 * @param models Current semantic model contents.
 * @param onChange Subscribes to semantic model changes; returns an unsubscribe function.
 * @param executeOperation Forwards operations to the corresponding semantic model.
 * @param options Controls pass-through and root-profile editing permissions.
 * Pass-through is always enabled for dependencies. Other profiles are read-only;
 * source vocabulary and cache operations are forwarded.
 * @returns Semantic model aggregator built from the hierarchy and model contents
 */
export function build(
  specificationId: ModelIdentifier,
  hierarchy: EntityRecord<ModelHierarchyEntity>,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
  executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  options?: SemanticModelAggregatorBuilderOptions,
): SemanticModelAggregator {
  const builder = new SemanticModelAggregatorBuilder(specificationId, hierarchy, models, onChange, executeOperation, options);
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
  private readonly knownModels: Record<ModelIdentifier, EntityModel> = {};
  private rootProfileId: ModelIdentifier | null = null;

  constructor(
    private readonly specificationId: ModelIdentifier,
    hierarchy: EntityRecord<ModelHierarchyEntity>,
    allModels: Record<ModelIdentifier, EntityRecord>,
    onChange: ((changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void) | undefined,
    executeOperation: ((modelId: ModelIdentifier, operation: any) => void) | undefined,
    private readonly options: SemanticModelAggregatorBuilderOptions = {},
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
    const specification = this.hierarchy[this.specificationId];
    if (!isSpecificationHierarchyEntity(specification)) {
      throw new Error(`Specification '${this.specificationId}' not found in the hierarchy.`);
    }
    this.rootProfileId = specification.applicationProfile;
    return this.buildModel(this.specificationId);
  }

  /**
   * Selects the specification's output and includes dependencies in pass-through mode.
   */
  private buildSpecification(specification: SpecificationHierarchyEntity): SemanticModelAggregator {
    const passThrough = specification.id !== this.specificationId || (this.options.forcePassThrough ?? false);
    const roots: ModelIdentifier[] = [];
    if (specification.applicationProfile !== null) {
      if (!isApplicationProfileHierarchyEntity(this.hierarchy[specification.applicationProfile])) {
        throw new Error(`Model '${specification.applicationProfile}' is not an application profile in the hierarchy.`);
      }
      roots.push(specification.applicationProfile);
    }
    if (specification.applicationProfile === null || passThrough) {
      for (const modelId of specification.vocabularies) {
        if (!isVocabularyHierarchyEntity(this.hierarchy[modelId])) {
          throw new Error(`Model '${modelId}' is not a vocabulary in the hierarchy.`);
        }
        roots.push(modelId);
      }
    }
    if (passThrough) {
      for (const modelId of specification.usedExternalSpecifications) {
        const entity = this.hierarchy[modelId];
        if (!isSpecificationHierarchyEntity(entity) && !isVocabularyHierarchyEntity(entity)) {
          throw new Error(`Model '${modelId}' is not a specification or external vocabulary in the hierarchy.`);
        }
        roots.push(modelId);
      }
    }
    return this.mergeIfNecessary([...new Set(roots)].map((modelId) => this.buildModel(modelId)));
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
    if (isSpecificationHierarchyEntity(entity)) {
      aggregator = this.buildSpecification(entity);
    } else if (isApplicationProfileHierarchyEntity(entity)) {
      const profiles = this.mergeIfNecessary(entity.profiles.map((id) => this.buildModel(id)));
      aggregator = this.buildApplicationProfile(modelId, profiles);
    } else if (isVocabularyHierarchyEntity(entity)) {
      aggregator = this.buildVocabulary(modelId);
    } else {
      throw new Error(`Model '${modelId}' is not a specification, vocabulary or application profile.`);
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
  ): SemanticModelAggregator {
    const isRootProfile = modelId === this.rootProfileId;
    const aggregator = new ApplicationProfileAggregator(this.getSemanticModel(modelId), profiles, true)
      .setCanAddEntities(isRootProfile && (this.options.canAddEntities ?? true))
      .setCanModify(isRootProfile && (this.options.canModify ?? true));
    (aggregator.thisVocabularyChain as any)["color"] = DEFAULT_COLOR;
    return aggregator;
  }

  private buildVocabulary(modelId: ModelIdentifier): SemanticModelAggregator {
    const model = this.getSemanticModel(modelId);
    const mainEntity = getMainEntity(model.getEntities()) as (Entity & Record<string, unknown>) | null;

    if (mainEntity?.["caches"]) {
      const cimAdapter = getProvidedSourceSemanticModel(mainEntity["caches"] as any[]);
      const aggregator = new ExternalModelWithCacheAggregator(model, cimAdapter);
      (aggregator.thisVocabularyChain as any)["color"] = DEFAULT_VOCABULARY_COLOR;
      return aggregator;
    }

    const aggregator = new VocabularyAggregator(model);
    (aggregator.thisVocabularyChain as any)["color"] = DEFAULT_VOCABULARY_COLOR;
    return aggregator;
  }

  /**
   * Merge multiple aggregators into one, or return single if only one provided
   */
  private mergeIfNecessary(aggregators: SemanticModelAggregator[]): SemanticModelAggregator {
    if (aggregators.length === 1) {
      return aggregators[0]!;
    }
    return new MergeAggregator(aggregators);
  }
}
