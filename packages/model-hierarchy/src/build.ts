import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ModelEntity, PackageEntity } from "@dataspecer/project-model";
import type { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "@dataspecer/specification/model-hierarchy";
import { MODEL_HIERARCHY_APPLICATION_PROFILE, MODEL_HIERARCHY_VOCABULARY, type ModelHierarchyEntity } from "./entities.ts";
import { QUERYABLE_MODEL } from "@dataspecer/core-v2/model/known-models";

/**
 * Id of the virtual project model (within {@link DefaultFrontendModelStore})
 * that holds the {@link ModelEntity}/{@link PackageEntity} entries describing
 * the project's structure.
 */
export const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * Model types for which there is no editing support at all, regardless of any
 * composition configuration or where the model is located.
 */
function isAlwaysReadOnlyModelType(modelType: string): boolean {
  return modelType === QUERYABLE_MODEL || modelType === RDFS_MODEL;
}

function isHierarchySemanticModelType(modelType: string): boolean {
  return modelType === LOCAL_SEMANTIC_MODEL || modelType === QUERYABLE_MODEL || modelType === RDFS_MODEL;
}

/**
 * Builds the model hierarchy for a project: one {@link ModelHierarchyEntity}
 * per semantic model that is reachable from the root package's model
 * composition, describing its kind and how it links to other models.
 *
 * @param mainProjectModelId ID of the root package of the project.
 * @param allModels Current state of every model in the project (as read from
 * the model store), including the virtual project model itself.
 */
export function buildModelHierarchy(mainProjectModelId: ModelIdentifier, allModels: Record<ModelIdentifier, EntityRecord>): EntityRecord<ModelHierarchyEntity> {
  return new ModelHierarchyBuilder(mainProjectModelId, allModels).build();
}

/**
 * Whether any of the given entity changes could affect the result of
 * {@link buildModelHierarchy}. Used to avoid recomputing the hierarchy for
 * every entity change in every model - only the project model's structure and
 * each model's own main entity (e.g. its `modelCompositionConfiguration`) are
 * ever actually read by the builder.
 */
export function isModelHierarchyRelevantChange(entityChanges: Record<ModelIdentifier, EntityChange[]>): boolean {
  for (const [modelId, changes] of Object.entries(entityChanges)) {
    if (changes.length === 0) {
      continue;
    }
    if (modelId === PROJECT_MODEL_ID) {
      return true;
    }
    // Only a change to the model's own main entity (e.g. its
    // modelCompositionConfiguration) can affect the hierarchy - changes to
    // regular content entities (classes, relationships, ...) cannot.
    if (changes.some((change) => (change.next ?? change.previous)?.id === modelId)) {
      return true;
    }
  }
  return false;
}

class ModelHierarchyBuilder {
  private readonly mainProjectModelId: ModelIdentifier;
  private readonly allModels: Record<ModelIdentifier, EntityRecord>;
  private readonly projectModel: EntityRecord<ModelEntity>;

  /**
   * Ids of models directly contained in the project's root package - the only
   * ones that are writable by default.
   */
  private readonly rootChildIds: Set<ModelIdentifier>;

  private readonly result: EntityRecord<ModelHierarchyEntity> = {};

  /**
   * Ids of models already resolved somewhere in the tree, so that a "merge
   * all" does not also pick up a model that was already explicitly
   * referenced (e.g. an application profile's own model).
   */
  private readonly usedModels: Set<ModelIdentifier> = new Set();

  constructor(mainProjectModelId: ModelIdentifier, allModels: Record<ModelIdentifier, EntityRecord>) {
    this.mainProjectModelId = mainProjectModelId;
    this.allModels = allModels;

    const projectModel = allModels[PROJECT_MODEL_ID];
    if (!projectModel) {
      throw new Error(`Project model with ID '${PROJECT_MODEL_ID}' is not available.`);
    }
    this.projectModel = projectModel as EntityRecord<ModelEntity>;

    const rootPackage = this.projectModel[mainProjectModelId] as PackageEntity | undefined;
    this.rootChildIds = new Set(rootPackage?.subModels ?? []);
  }

  build(): EntityRecord<ModelHierarchyEntity> {
    this.resolveModelReference(this.mainProjectModelId);
    return this.result;
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

    const rootModel = this.allModels[packageId]?.[packageId] as unknown as Record<string, unknown> | undefined;
    const explicitConfiguration = rootModel?.modelCompositionConfiguration as ModelCompositionConfiguration | undefined;

    if (explicitConfiguration) {
      return explicitConfiguration;
    }

    // Generate default configuration
    const hasProfile = packageEntity.subModels.some((subModelId) => {
      const subModel = this.projectModel[subModelId] as ModelEntity | undefined;
      return subModel && subModel.id.endsWith("/profile");
    });

    /**
     * Hack: We want profiled specification to be less strict regarding the
     * passing of other non-profiled entities, therefore we use the (i) profile
     * and its (ii) profiles in merge to allow (ii) profiles to pass.
     */
    const isSubSpecification = packageId !== this.mainProjectModelId;

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
      const subModel = this.projectModel[subModelId] as ModelEntity | undefined;
      if (subModel) {
        if (isHierarchySemanticModelType(subModel.modelType)) {
          semanticModels.push(subModel.id);
        } else if (subModel.modelType === LOCAL_PACKAGE) {
          subPackages.push(subModel.id);
        }
      }
    }

    return { semanticModels, subPackages };
  }

  /**
   * Resolves a single model/package reference to the flat list of semantic
   * model ids it ultimately stands for, emitting a hierarchy entity for any
   * semantic model encountered along the way.
   */
  private resolveModelReference(modelId: ModelIdentifier): ModelIdentifier[] {
    this.usedModels.add(modelId);
    const entity = this.projectModel[modelId] as ModelEntity | undefined;

    if (entity?.modelType === LOCAL_PACKAGE) {
      // It's a package, recurse
      const configuration = this.getCompositionConfiguration(modelId);
      return this.resolveConfiguration(modelId, configuration);
    }

    // It's a semantic model
    this.emitVocabulary(modelId);
    return [modelId];
  }

  /**
   * Resolves a composition configuration to the flat list of semantic model
   * ids it ultimately stands for.
   */
  private resolveConfiguration(packageId: ModelIdentifier, configuration: ModelCompositionConfiguration): ModelIdentifier[] {
    if (typeof configuration === "string") {
      // Single model reference
      return this.resolveModelReference(configuration);
    } else if (configuration.modelType === "application-profile") {
      // Application profile configuration
      const profileConfig = configuration as ModelCompositionConfigurationApplicationProfile;
      const profileModelId = profileConfig.model as string;
      this.usedModels.add(profileModelId);

      const profiles = this.resolveConfiguration(packageId, profileConfig.profiles);
      const passThrough = profileConfig.allowPassThrough ?? false;

      this.emitApplicationProfile(profileModelId, profiles, profileConfig.canModify ?? true, passThrough);

      return passThrough ? [profileModelId, ...profiles] : [profileModelId];
    } else if (configuration.modelType === "merge") {
      // Merge configuration
      const mergeConfig = configuration as ModelCompositionConfigurationMerge;

      if (!mergeConfig.models) {
        // Use all models in the package
        return this.resolveMergeAllModels(packageId);
      } else {
        // Build from explicit model list
        return mergeConfig.models.flatMap((modelRef) => this.resolveConfiguration(packageId, modelRef.model));
      }
    } else {
      throw new Error(`Unsupported model composition type: ${(configuration as { modelType: string }).modelType}`);
    }
  }

  /**
   * Resolve merge from all models in a package (excluding already used models)
   */
  private resolveMergeAllModels(packageId: ModelIdentifier): ModelIdentifier[] {
    const { semanticModels, subPackages } = this.getPackageContents(packageId);

    const resolved: ModelIdentifier[] = [];

    for (const modelId of semanticModels) {
      if (!this.usedModels.has(modelId)) {
        resolved.push(...this.resolveModelReference(modelId));
      }
    }

    for (const subPackageId of subPackages) {
      if (!this.usedModels.has(subPackageId)) {
        resolved.push(...this.resolveModelReference(subPackageId));
      }
    }

    return resolved;
  }

  private emitVocabulary(modelId: ModelIdentifier): void {
    if (this.result[modelId]) {
      return;
    }

    const modelEntity = this.projectModel[modelId] as ModelEntity | undefined;
    const modelEntities = this.allModels[modelId];
    if (!modelEntity || !modelEntities) {
      // Model is referenced from the project structure but its data is not (yet) loaded.
      return;
    }

    this.result[modelId] = {
      id: modelId,
      type: [MODEL_HIERARCHY_VOCABULARY],
      modelType: modelEntity.modelType,
      label: modelEntity.label,
      writable: isAlwaysReadOnlyModelType(modelEntity.modelType) ? false : this.rootChildIds.has(modelId),
      imports: [],
      passThrough: false,
    };
  }

  private emitApplicationProfile(modelId: ModelIdentifier, profiles: ModelIdentifier[], writable: boolean, passThrough: boolean): void {
    if (this.result[modelId]) {
      return;
    }

    const modelEntity = this.projectModel[modelId] as ModelEntity | undefined;
    const modelEntities = this.allModels[modelId];
    if (!modelEntity || !modelEntities) {
      // Model is referenced from the project structure but its data is not (yet) loaded.
      return;
    }

    this.result[modelId] = {
      id: modelId,
      type: [MODEL_HIERARCHY_APPLICATION_PROFILE],
      modelType: modelEntity.modelType,
      label: modelEntity.label,
      writable,
      profiles,
      passThrough,
    };
  }
}
