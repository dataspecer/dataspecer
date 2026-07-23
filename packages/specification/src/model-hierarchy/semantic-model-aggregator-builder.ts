import {
  ApplicationProfileAggregator,
  EntityModel,
  ExternalModelWithCacheAggregator,
  getMainEntity,
  MergeAggregator,
  SemanticModelAggregator,
  VocabularyAggregator,
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ProjectModelEntity, PackageEntity } from "@dataspecer/project-model";
import { VisualModelData } from "@dataspecer/visual-model";
import { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "./composition-configuration.ts";
import { getProvidedSourceSemanticModel } from "./adapter.ts";

const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";
const DEFAULT_VOCABULARY_COLOR = "#f9aa49";
const DEFAULT_COLOR = "#4998f9";

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
 * @param forcePassThrough Treats `mainProjectModelId` itself as a
 * sub-specification for the purpose of the default application-profile
 * composition's `allowPassThrough`, so entities of the profiled models pass
 * through alongside the profile's own entities even though `mainProjectModelId`
 * is the root of this build. Normally that only happens for a package nested
 * under the root. Used when building the aggregation of one package in
 * isolation (rather than from the project's true root), where the same "less
 * strict" behavior is wanted regardless of the package's actual position in
 * the project.
 * @returns Semantic model aggregator built from the given models and configuration
 */
export function build(
  mainProjectModelId: ModelIdentifier,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
  executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
  forcePassThrough?: boolean,
): SemanticModelAggregator {
  const builder = new SemanticModelAggregatorBuilder(mainProjectModelId, models, onChange, executeOperation, forcePassThrough);
  return builder.build();
}

/**
 * Helper function to check if a model type is a semantic model type
 */
function isSemanticModelType(modelType: string): boolean {
  return [LOCAL_SEMANTIC_MODEL, V1.CIM, V1.PIM, QUERYABLE_MODEL, RDFS_MODEL].includes(modelType);
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
  private readonly mainProjectModelId: ModelIdentifier;
  private readonly allModels: Record<ModelIdentifier, EntityRecord>;
  private readonly projectModel: EntityRecord<ProjectModelEntity>;
  private readonly onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void;
  private readonly executeOperation?: (modelId: ModelIdentifier, operation: any) => void;
  private readonly forcePassThrough: boolean;
  private knownModels: Record<string, EntityModel> = {};
  private modelData: Record<string, VisualModelData> = {};
  private usedModels: Set<string> = new Set();

  constructor(
    mainProjectModelId: ModelIdentifier,
    allModels: Record<ModelIdentifier, EntityRecord>,
    onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,
    executeOperation?: (modelId: ModelIdentifier, operation: any) => void,
    forcePassThrough?: boolean,
  ) {
    this.mainProjectModelId = mainProjectModelId;
    this.allModels = allModels;
    this.onChange = onChange;
    this.executeOperation = executeOperation;
    this.forcePassThrough = forcePassThrough ?? false;

    const projectModel = this.allModels[PROJECT_MODEL_ID];

    if (!projectModel) {
      throw new Error(`Project model with ID '${PROJECT_MODEL_ID}' is not available.`);
    }

    this.projectModel = projectModel as EntityRecord<ProjectModelEntity>;
  }

  /**
   * Main entry point: builds the aggregator for the root package
   */
  build(): SemanticModelAggregator {
    this.knownModels = {};
    this.modelData = {};
    this.usedModels = new Set();
    return this.buildFromModelReference(this.mainProjectModelId);
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
      const subModel = this.projectModel[subModelId] as ProjectModelEntity | undefined;
      return subModel && subModel.id.endsWith("/profile");
    });

    /**
     * Hack: We want profiled specification to be less strict regarding the
     * passing of other non-profiled entities, therefore we use the (i) profile
     * and its (ii) profiles in merge to allow (ii) profiles to pass.
     */
    const isSubSpecification = packageId !== this.mainProjectModelId || this.forcePassThrough;

    if (hasProfile) {
      return {
        modelType: "application-profile",
        model: packageId + "/profile",
        profiles: { modelType: "merge", models: null },
        canAddEntities: true,
        canModify: true,

        allowPassThrough: isSubSpecification,
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
      const subModel = this.projectModel[subModelId] as ProjectModelEntity | undefined;
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
  private getSemanticModel(modelId: string): EntityModel {
    if (this.knownModels[modelId]) {
      return this.knownModels[modelId];
    }

    const model = new EntityRecordModel(modelId, this.allModels[modelId] as EntityRecord, this.onChange, this.executeOperation);

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

      if (profileConfig.allowPassThrough) {
        return new MergeAggregator([aggregator, profilesAggregator]);
      } else {
        return aggregator;
      }
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
    const entity = this.projectModel[modelId] as ProjectModelEntity | undefined;

    if (entity?.modelType === LOCAL_PACKAGE) {
      // It's a package, recurse
      const configuration = this.getCompositionConfiguration(modelId);
      const aggregator = this.buildFromConfiguration(modelId, configuration);

      // The package may reuse data structures from other, unrelated packages
      // via `dataStructuresImportPackages`. Their models are merged in
      // alongside the package's own content.
      const rootModel = this.allModels[modelId]?.[modelId] as Record<string, unknown> | undefined;
      const importedPackageIds = (rootModel?.dataStructuresImportPackages as string[] | undefined) ?? [];
      const importedAggregators = importedPackageIds
        .filter((importedPackageId) => !this.usedModels.has(importedPackageId))
        .map((importedPackageId) => this.buildFromModelReference(importedPackageId));

      if (importedAggregators.length === 0) {
        return aggregator;
      }
      return new MergeAggregator([aggregator, ...importedAggregators]);
    }

    // It's a semantic model
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
