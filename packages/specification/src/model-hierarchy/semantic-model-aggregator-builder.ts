import { ApplicationProfileAggregator, ExternalModelWithCacheAggregator, MergeAggregator, SemanticModelAggregator, VocabularyAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ModelEntity, PackageEntity } from "@dataspecer/project-model";
import { VisualModelData } from "@dataspecer/visual-model";
import { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "./composition-configuration.ts";
import { getProvidedSourceSemanticModel } from "./adapter.ts";

const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";
const DEFAULT_VOCABULARY_COLOR = "#f9aa49";
const DEFAULT_COLOR = "#4998f9";
const SGOV_MODEL_DESCRIPTOR = "https://dataspecer.com/core/model-descriptor/sgov";
const PIM_STORE_WRAPPER_DESCRIPTOR = "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";

/**
 * Build semantic model aggregator. If onChange is not provided, then the model
 * is static.
 *
 * @param mainProjectModelId The ID of the root package to build from
 * @param models Current state of models, including the project model and all
 * semantic models needed for the aggregation
 * @param onChange Callback to subscribe to changes in the models, needed for
 * the editor to update the UI after changes. Returns a function to cancel subscription
 * @param executeOperation Callback to execute operations on the models, needed
 * for the editor to modify the models after user interaction
 * @returns Semantic model aggregator built from the given models and configuration
 */
export function build(
  mainProjectModelId: ModelIdentifier,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
  executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
): SemanticModelAggregator {
  const builder = new SemanticModelAggregatorBuilder(mainProjectModelId, models, onChange, executeOperation);
  return builder.build();
}

/**
 * Helper function to check if a model type is a semantic model type
 */
function isSemanticModelType(modelType: string): boolean {
  return [LOCAL_SEMANTIC_MODEL, V1.CIM, V1.PIM, SGOV_MODEL_DESCRIPTOR, PIM_STORE_WRAPPER_DESCRIPTOR].includes(modelType);
}

/**
 * Helper function to check if an entity is the main entity of a model
 */
function isMainEntity(entity: Entity | null | undefined, modelId: string): boolean {
  if (!entity) {
    return false;
  }
  if (entity.id === modelId) {
    return true;
  }
  return false;
}

/**
 * Remove known main entity fields from metadata
 */
function removeKnownMainEntityFields(entity: Record<string, unknown>): Record<string, unknown> {
  const metadata = { ...entity };
  delete metadata.id;
  delete metadata.type;
  delete metadata.modelId;
  delete metadata.modelAlias;
  delete metadata.baseIri;
  delete metadata.entities;
  return metadata;
}

/**
 * Wraps an EntityRecord as an InMemorySemanticModel
 */
class EntityRecordAsInMemorySemanticModel extends InMemorySemanticModel {
  private readonly modelId: ModelIdentifier;
  private readonly executeOperationCallback?: (modelId: ModelIdentifier, operation: any) => void;

  constructor(
    modelId: ModelIdentifier,
    entities: EntityRecord,
    label: Record<string, string> | undefined,
    onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
    executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  ) {
    super();
    this.modelId = modelId;
    this.executeOperationCallback = executeOperation;

    this.initializeFromEntityRecord(entities, label);

    if (onChange) {
      onChange((changes) => {
        const modelChanges = changes[this.modelId];
        if (!modelChanges || modelChanges.length === 0) {
          return;
        }
        this.applyExternalChanges(modelChanges);
      });
    }
  }

  private initializeFromEntityRecord(entities: EntityRecord, label?: Record<string, string>): void {
    const mainEntity = entities[this.modelId] as Record<string, unknown> | undefined;

    const modelAlias = typeof mainEntity?.["modelAlias"] === "string" ? (mainEntity["modelAlias"] as string) : (label?.en ?? label?.cs ?? this.modelId);

    const baseIri = typeof mainEntity?.["baseIri"] === "string" ? (mainEntity["baseIri"] as string) : "";

    const semanticEntities = Object.fromEntries(
      Object.entries(entities)
        .filter(([_, entity]) => !isMainEntity(entity as Entity, this.modelId))
        .map(([id, entity]) => [id, entity as SemanticModelEntity]),
    );

    this.deserializeModel({
      ...(mainEntity ? removeKnownMainEntityFields(mainEntity) : {}),
      modelId: this.modelId,
      modelAlias,
      baseIri,
      entities: semanticEntities,
    });
  }

  private applyExternalChanges(changes: EntityChange[]): void {
    const updated: Record<string, Entity> = {};
    const removed: string[] = [];

    for (const change of changes) {
      if (change.next) {
        if (isMainEntity(change.next, this.modelId)) {
          const mainEntityData = change.next as unknown as Record<string, unknown>;
          if (typeof mainEntityData["modelAlias"] === "string") {
            this.setAlias(mainEntityData["modelAlias"] as string);
          }
          if (typeof mainEntityData["baseIri"] === "string") {
            this.setBaseIri(mainEntityData["baseIri"] as string);
          }
          Object.assign(this.modelMetadata, removeKnownMainEntityFields(mainEntityData));
          continue;
        }
        updated[change.next.id] = change.next;
      }

      if (change.previous && change.next === null && !isMainEntity(change.previous, this.modelId)) {
        removed.push(change.previous.id);
      }
    }

    if (Object.keys(updated).length > 0 || removed.length > 0) {
      this.entityModel.change(updated, removed);
    }
  }

  override executeOperations(operations: any[]): any[] {
    const result = super.executeOperations(operations);
    if (this.executeOperationCallback) {
      for (const operation of operations) {
        this.executeOperationCallback(this.modelId, operation);
      }
    }
    return result;
  }
}

/**
 * Builder for semantic model aggregators
 */
class SemanticModelAggregatorBuilder {
  private readonly mainProjectModelId: ModelIdentifier;
  private readonly allModels: Record<ModelIdentifier, EntityRecord>;
  private readonly projectModel: EntityRecord<ModelEntity>;
  private readonly onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void;
  private readonly executeOperation?: (modelId: ModelIdentifier, operation: any) => void;
  private knownModels: Record<string, InMemorySemanticModel> = {};
  private modelData: Record<string, VisualModelData> = {};
  private usedModels: Set<string> = new Set();

  constructor(
    mainProjectModelId: ModelIdentifier,
    allModels: Record<ModelIdentifier, EntityRecord>,
    onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
    executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  ) {
    this.mainProjectModelId = mainProjectModelId;
    this.allModels = allModels;
    this.onChange = onChange;
    this.executeOperation = executeOperation;

    const projectModel = this.allModels[PROJECT_MODEL_ID];

    if (!projectModel) {
      throw new Error(`Project model with ID '${PROJECT_MODEL_ID}' is not available.`);
    }

    this.projectModel = projectModel as EntityRecord<ModelEntity>;
  }

  /**
   * Main entry point: builds the aggregator for the root package
   */
  build(): SemanticModelAggregator {
    this.knownModels = {};
    this.modelData = {};
    this.usedModels = new Set();
    const rootConfiguration = this.getCompositionConfiguration(this.mainProjectModelId);
    return this.buildFromConfiguration(this.mainProjectModelId, rootConfiguration);
  }

  /**
   * Get the composition configuration for a package.
   * If not explicitly defined, generates a default one based on presence of /profile model
   */
  private getCompositionConfiguration(packageId: ModelIdentifier): ModelCompositionConfiguration {
    const packageEntity = this.projectModel[packageId] as PackageEntity | undefined;
    if (!packageEntity) {
      throw new Error(`Package '${packageId}' not found in project model.`);
    }

    const rootModel = this.allModels[packageId]?.[packageId] as Record<string, unknown> | undefined;
    const explicitConfiguration = rootModel?.modelCompositionConfiguration as ModelCompositionConfiguration | undefined;

    if (explicitConfiguration) {
      return explicitConfiguration;
    }

    // Generate default configuration
    const hasProfile = packageEntity.subModels.some((subModelId) => {
      const subModel = this.projectModel[subModelId] as ModelEntity | undefined;
      return subModel && subModel.id.endsWith("/profile");
    });

    if (hasProfile) {
      return {
        modelType: "application-profile",
        model: packageId + "/profile",
        profiles: { modelType: "merge", models: null },
        canAddEntities: true,
        canModify: true,
      } as unknown as ModelCompositionConfigurationApplicationProfile;
    }

    return { modelType: "merge", models: null } as ModelCompositionConfigurationMerge;
  }

  /**
   * Get all semantic models and sub-packages for a given package
   */
  private getPackageContents(packageId: ModelIdentifier): {
    semanticModels: string[];
    subPackages: string[];
  } {
    const packageEntity = this.projectModel[packageId] as PackageEntity | undefined;
    if (!packageEntity) {
      throw new Error(`Package '${packageId}' not found in project model.`);
    }

    const semanticModels: string[] = [];
    const subPackages: string[] = [];

    for (const subModelId of packageEntity.subModels) {
      const subModel = this.projectModel[subModelId] as ModelEntity | undefined;
      if (subModel) {
        if (isSemanticModelType(subModel.modelType)) {
          semanticModels.push(subModel.id);
        } else if (subModel.modelType === LOCAL_PACKAGE) {
          subPackages.push(subModel.id);
        }
      }
    }

    return { semanticModels, subPackages };
  }

  /**
   * Get or create a semantic model wrapper for the given model ID
   */
  private getSemanticModel(modelId: string): InMemorySemanticModel {
    if (this.knownModels[modelId]) {
      return this.knownModels[modelId];
    }

    const model = new EntityRecordAsInMemorySemanticModel(modelId, this.allModels[modelId] as EntityRecord, undefined, this.onChange, this.executeOperation);

    this.knownModels[modelId] = model;
    return model;
  }

  /**
   * Build a semantic model aggregator from a configuration
   */
  private buildFromConfiguration(packageId: ModelIdentifier, configuration: ModelCompositionConfiguration): SemanticModelAggregator {
    if (typeof configuration === "string") {
      // Single model reference
      return this.buildFromModelReference(configuration);
    } else if (configuration.modelType === "application-profile") {
      // Application profile configuration
      const profileConfig = configuration as ModelCompositionConfigurationApplicationProfile;
      const profileModelId = profileConfig.model as string;
      this.usedModels.add(profileModelId);
      const model = this.getSemanticModel(profileModelId);
      const profilesAggregator = this.buildFromConfiguration(packageId, profileConfig.profiles);

      const aggregator = new ApplicationProfileAggregator(model, profilesAggregator, true)
        .setCanAddEntities(profileConfig.canAddEntities ?? true)
        .setCanModify(profileConfig.canModify ?? true);

      (aggregator.thisVocabularyChain as any)["color"] = this.modelData[profileModelId]?.color ?? DEFAULT_COLOR;

      return aggregator;
    } else if (configuration.modelType === "merge") {
      // Merge configuration
      const mergeConfig = configuration as ModelCompositionConfigurationMerge;

      if (!mergeConfig.models) {
        // Use all models in the package
        return this.buildMergeFromAllModels(packageId);
      } else {
        // Build from explicit model list
        const models = mergeConfig.models.map((modelRef) => this.buildFromConfiguration(packageId, modelRef.model));
        return this.mergeIfNecessary(models);
      }
    } else {
      throw new Error(`Unsupported model composition type: ${(configuration as any).modelType}`);
    }
  }

  /**
   * Build a single model reference (either semantic model or package)
   */
  private buildFromModelReference(modelId: string): SemanticModelAggregator {
    this.usedModels.add(modelId);
    const entity = this.projectModel[modelId] as ModelEntity | undefined;

    if (entity?.modelType === LOCAL_PACKAGE) {
      // It's a package, recurse
      const configuration = this.getCompositionConfiguration(modelId);
      return this.buildFromConfiguration(modelId, configuration);
    }

    // It's a semantic model
    const model = this.getSemanticModel(modelId);

    if ((model.modelMetadata as any)?.["caches"]) {
      const cimAdapter = getProvidedSourceSemanticModel((model.modelMetadata as any)["caches"]);
      const aggregator = new ExternalModelWithCacheAggregator(model, cimAdapter);
      (aggregator.thisVocabularyChain as any)["color"] = this.modelData[modelId]?.color ?? DEFAULT_VOCABULARY_COLOR;
      return aggregator;
    }

    const aggregator = new VocabularyAggregator(model);
    (aggregator.thisVocabularyChain as any)["color"] = this.modelData[modelId]?.color ?? DEFAULT_VOCABULARY_COLOR;
    return aggregator;
  }

  /**
   * Build merge aggregator from all models in a package (excluding already used models)
   */
  private buildMergeFromAllModels(packageId: ModelIdentifier): SemanticModelAggregator {
    const { semanticModels, subPackages } = this.getPackageContents(packageId);

    const aggregators: SemanticModelAggregator[] = [];

    // Build aggregators for semantic models that haven't been used
    for (const modelId of semanticModels) {
      if (!this.usedModels.has(modelId)) {
        aggregators.push(this.buildFromModelReference(modelId));
      }
    }

    // Build aggregators for sub-packages that haven't been used
    for (const subPackageId of subPackages) {
      if (!this.usedModels.has(subPackageId)) {
        aggregators.push(this.buildFromModelReference(subPackageId));
      }
    }

    return this.mergeIfNecessary(aggregators);
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
