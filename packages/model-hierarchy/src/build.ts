import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_ID, type ProjectModelEntity, type PackageEntity } from "@dataspecer/core/project-model";
import { MODEL_HIERARCHY_APPLICATION_PROFILE, MODEL_HIERARCHY_VOCABULARY, MODEL_HIERARCHY_SPECIFICATION, isSpecificationHierarchyEntity, type ModelHierarchyEntity } from "./entities.ts";
import type { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "./composition-configuration.ts";

export { PROJECT_MODEL_ID } from "@dataspecer/core/project-model";

export function isSemanticModelType(modelType: string): boolean {
  return [LOCAL_SEMANTIC_MODEL, V1.CIM, V1.PIM, QUERYABLE_MODEL, RDFS_MODEL].includes(modelType);
}

/**
 * Model types for which there is no editing support at all, regardless of any
 * composition configuration or where the model is located.
 */
function isAlwaysReadOnlyModelType(modelType: string): boolean {
  return modelType === QUERYABLE_MODEL || modelType === RDFS_MODEL;
}

/**
 * Builds the model hierarchy for a project: one {@link ModelHierarchyEntity}
 * per reachable semantic model and package, describing dependencies and
 * the models exposed by each package.
 *
 * @param mainProjectModelId ID of the root package of the project.
 * @param allModels Current state of every model in the project (as read from
 * the model store), including the virtual project model itself.
 * @param forcePassThrough Enables pass-through for the root package's application profile.
 */
export function buildModelHierarchy(
  mainProjectModelId: ModelIdentifier,
  allModels: Record<ModelIdentifier, EntityRecord>,
  forcePassThrough = false,
): EntityRecord<ModelHierarchyEntity> {
  return new ModelHierarchyBuilder(mainProjectModelId, allModels, forcePassThrough).build();
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
  private readonly projectModel: EntityRecord<ProjectModelEntity>;

  /**
   * Ids of models directly contained in the project's root package - the only
   * ones that are writable by default.
   */
  private readonly rootChildIds: Set<ModelIdentifier>;

  private readonly result: EntityRecord<ModelHierarchyEntity> = {};
  private readonly usedModels = new Set<ModelIdentifier>();
  private readonly applicationProfileIds = new Set<ModelIdentifier>();

  constructor(mainProjectModelId: ModelIdentifier, allModels: Record<ModelIdentifier, EntityRecord>, private readonly forcePassThrough: boolean) {
    this.mainProjectModelId = mainProjectModelId;
    this.allModels = allModels;

    const projectModel = allModels[PROJECT_MODEL_ID];
    if (!projectModel) {
      throw new Error(`Project model with ID '${PROJECT_MODEL_ID}' is not available.`);
    }
    this.projectModel = projectModel as EntityRecord<ProjectModelEntity>;

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

    const rootModel = this.allModels[packageId]?.[packageId] as (Entity & {
      modelCompositionConfiguration?: ModelCompositionConfiguration;
    }) | undefined;
    const explicitConfiguration = rootModel?.modelCompositionConfiguration;

    if (explicitConfiguration) {
      if (typeof explicitConfiguration !== "string" && explicitConfiguration.modelType === "application-profile" && packageId === this.mainProjectModelId && this.forcePassThrough) {
        return { ...explicitConfiguration, allowPassThrough: true } as ModelCompositionConfigurationApplicationProfile;
      }
      return explicitConfiguration;
    }

    // Generate default configuration
    const hasProfile = packageEntity.subModels.some((subModelId) => {
      const subModel = this.projectModel[subModelId] as ProjectModelEntity | undefined;
      return subModel && subModel.id.endsWith("/profile");
    });

    // Nested packages also expose entities from their profiled models.
    const allowPassThrough = packageId !== this.mainProjectModelId || this.forcePassThrough;

    if (hasProfile) {
      return {
        modelType: "application-profile",
        model: packageId + "/profile",
        profiles: { modelType: "merge", models: null },
        canAddEntities: true,
        canModify: true,

        allowPassThrough,
      } as ModelCompositionConfigurationApplicationProfile;
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

  private resolveModelReference(modelId: ModelIdentifier): ModelIdentifier[] {
    this.usedModels.add(modelId);
    const entity = this.projectModel[modelId];
    if (entity?.modelType === LOCAL_PACKAGE) {
      const specification = this.result[modelId];
      if (isSpecificationHierarchyEntity(specification)) {
        return specification.applicationProfile === null
          ? specification.vocabularies
          : [specification.applicationProfile, ...specification.vocabularies];
      }
      const roots = this.resolveConfiguration(modelId, this.getCompositionConfiguration(modelId));
      const applicationProfiles = roots.filter((id) => this.applicationProfileIds.has(id));
      this.result[modelId] = {
        id: modelId,
        type: [MODEL_HIERARCHY_SPECIFICATION],
        modelType: entity.modelType,
        label: entity.label,
        projectId: entity.projectId,
        vocabularies: [...new Set(roots.filter((id) => !this.applicationProfileIds.has(id)))],
        applicationProfile: applicationProfiles[0] ?? null,
      };
      return roots;
    }
    this.emitVocabulary(modelId);
    return [modelId];
  }

  private resolveConfiguration(packageId: ModelIdentifier, configuration: ModelCompositionConfiguration): ModelIdentifier[] {
    if (typeof configuration === "string") {
      return this.resolveModelReference(configuration);
    } else if (configuration.modelType === "application-profile") {
      const profileConfig = configuration as ModelCompositionConfigurationApplicationProfile;
      const profileModelId = profileConfig.model as ModelIdentifier;
      this.usedModels.add(profileModelId);
      this.applicationProfileIds.add(profileModelId);
      const profiles = this.resolveConfiguration(packageId, profileConfig.profiles);
      this.emitApplicationProfile(profileModelId, profiles, profileConfig);
      return [profileModelId];
    } else if (configuration.modelType === "merge") {
      const mergeConfig = configuration as ModelCompositionConfigurationMerge;
      const models = !mergeConfig.models
        ? this.resolveMergeAllModels(packageId)
        : mergeConfig.models.flatMap((modelRef) => this.resolveConfiguration(packageId, modelRef.model));
      const applicationProfiles = new Set(models.filter((id) => this.applicationProfileIds.has(id)));
      if (applicationProfiles.size > 1) {
        throw new Error(`Package '${packageId}' cannot merge multiple application profiles: ${[...applicationProfiles].join(", ")}.`);
      }
      return models;
    }
    throw new Error(`Unsupported model composition type: ${configuration.modelType}`);
  }

  private resolveMergeAllModels(packageId: ModelIdentifier): ModelIdentifier[] {
    const { semanticModels, subPackages } = this.getPackageContents(packageId);
    const resolved: ModelIdentifier[] = [];
    for (const modelId of [...semanticModels, ...subPackages]) {
      if (!this.usedModels.has(modelId)) {
        resolved.push(...this.resolveModelReference(modelId));
      }
    }
    return resolved;
  }

  /**
   * Whether the model belongs to the project being worked on, as opposed to a
   * project it reuses. Only models of the own project can be written to from
   * here.
   */
  private isOwnModel(modelEntity: ProjectModelEntity): boolean {
    return modelEntity.projectId === this.mainProjectModelId;
  }

  private emitVocabulary(modelId: ModelIdentifier): void {
    if (this.result[modelId]) {
      return;
    }

    const modelEntity = this.projectModel[modelId] as ProjectModelEntity | undefined;
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
      projectId: modelEntity.projectId,
      writable: isAlwaysReadOnlyModelType(modelEntity.modelType) ? false : this.rootChildIds.has(modelId) && this.isOwnModel(modelEntity),
      imports: [],
      passThrough: false,
    };
  }

  private emitApplicationProfile(modelId: ModelIdentifier, profiles: ModelIdentifier[], configuration: ModelCompositionConfigurationApplicationProfile): void {
    if (this.result[modelId]) {
      return;
    }

    const modelEntity = this.projectModel[modelId] as ProjectModelEntity | undefined;
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
      projectId: modelEntity.projectId,
      writable: (configuration.canModify ?? true) && this.isOwnModel(modelEntity),
      canAddEntities: configuration.canAddEntities ?? true,
      canModify: configuration.canModify ?? true,
      profiles,
      passThrough: configuration.allowPassThrough ?? false,
    };
  }
}
