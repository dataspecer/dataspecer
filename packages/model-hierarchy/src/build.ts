import { isModelProfile, isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_ID, isPackageEntity, type ProjectModelEntity, type PackageEntity } from "@dataspecer/core/project-model";
import { MODEL_HIERARCHY_APPLICATION_PROFILE, MODEL_HIERARCHY_VOCABULARY, MODEL_HIERARCHY_SPECIFICATION, type ModelHierarchyEntity, type SpecificationHierarchyEntity, type VocabularyHierarchyEntity, type ApplicationProfileHierarchyEntity } from "./entities.ts";

export { PROJECT_MODEL_ID } from "@dataspecer/core/project-model";

export function isSemanticModelType(modelType: string): boolean {
  return [LOCAL_SEMANTIC_MODEL, V1.CIM, V1.PIM, QUERYABLE_MODEL, RDFS_MODEL].includes(modelType);
}

/**
 * Builds the model hierarchy for a project: one {@link ModelHierarchyEntity}
 * per reachable semantic model and package, describing dependencies and
 * the models exposed by each package. Empty or unloaded semantic models are
 * classified as vocabularies until profiling entities are available.
 *
 * @param rootProjectModelId ID of the root package of the project.
 * @param allModels Current state of every model in the project (as read from
 * the model store), including the virtual project model itself.
 */
export function buildModelHierarchy(rootProjectModelId: ModelIdentifier, allModels: Record<ModelIdentifier, EntityRecord>): EntityRecord<ModelHierarchyEntity> {
  return new ModelHierarchyBuilder(rootProjectModelId, allModels).build();
}

/**
 * Whether any of the given entity changes could affect the result of
 * {@link buildModelHierarchy}. Used to avoid recomputing the hierarchy for
 * every entity change. Package structure and the presence
 * of class or relationship profiles determine the hierarchy.
 */
export function isModelHierarchyRelevantChange(entityChanges: Record<ModelIdentifier, EntityChange[]>): boolean {
  for (const [modelId, changes] of Object.entries(entityChanges)) {
    if (changes.length === 0) {
      continue;
    }
    if (modelId === PROJECT_MODEL_ID) {
      return true;
    }
    if (changes.some((change) => [change.previous, change.next].some((entity) => entity && (isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity))))) {
      return true;
    }
  }
  return false;
}

/**
 * Records each specification's local definitions and direct dependencies.
 * Aggregation policies are applied by consumers of the hierarchy.
 */
class ModelHierarchyBuilder {
  private readonly entities: EntityRecord<ModelHierarchyEntity> = {};
  private readonly projectModel: EntityRecord<ProjectModelEntity>;

  constructor (private readonly rootProjectModelId: ModelIdentifier, private readonly models: Record<ModelIdentifier, EntityRecord>) {
    this.projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ProjectModelEntity>;
  }

  build(): EntityRecord<ModelHierarchyEntity> {
    if (!this.projectModel) {
      throw new Error(`Project model with ID '${PROJECT_MODEL_ID}' is not available.`);
    }
    const root = this.projectModel[this.rootProjectModelId];
    if (!root || !isPackageEntity(root)) {
      throw new Error(`Root package '${this.rootProjectModelId}' is not available.`);
    }

    // Create package exports before resolving dependencies, including cycles.
    this.buildSpecification(this.rootProjectModelId);
    for (const entity of Object.values(this.entities)) {
      if (entity.type[0] !== MODEL_HIERARCHY_SPECIFICATION) {
        continue;
      }
      const specification = entity as SpecificationHierarchyEntity;
      const pkg = this.projectModel[specification.id] as PackageEntity;
      const externalSpecifications: ModelIdentifier[] = [];
      for (const id of pkg.subModels) {
        const dependency = this.entities[id];
        if (!dependency) {
          continue;
        }
        if (dependency.type[0] === MODEL_HIERARCHY_SPECIFICATION ||
          (dependency.type[0] === MODEL_HIERARCHY_VOCABULARY && dependency.modelType !== LOCAL_SEMANTIC_MODEL)) {
          externalSpecifications.push(id);
        }
      }
      specification.usedExternalSpecifications = [...new Set(externalSpecifications)];
      if (specification.applicationProfile !== null) {
        (this.entities[specification.applicationProfile] as ApplicationProfileHierarchyEntity).profiles =
          [...specification.vocabularies, ...specification.usedExternalSpecifications];
      }
    }
    return this.entities;
  }

  private buildSpecification(packageId: ModelIdentifier): void {
    if (this.entities[packageId]) {
      return;
    }
    const pkg = this.projectModel[packageId] as PackageEntity;
    const specification = this.buildSpecificationHierarchyEntity(packageId);
    for (const id of pkg.subModels) {
      const model = this.projectModel[id];
      if (!model) {
        throw new Error(`Model '${id}' referenced by package '${packageId}' is not available in the project model.`);
      }
      if (isPackageEntity(model)) {
        this.buildSpecification(id);
      } else if (isSemanticModelType(model.modelType)) {
        if (isModelProfile(this.models[id] ?? {})) {
          if (specification.applicationProfile !== null && specification.applicationProfile !== id) {
            throw new Error(`Package '${packageId}' has multiple application profiles.`);
          }
          if (!this.entities[id]) {
            this.buildApplicationProfileHierarchyEntity(id, packageId);
          }
          specification.applicationProfile = id;
        } else {
          if (!this.entities[id]) {
            this.buildVocabularyHierarchyEntity(id, packageId);
          }
          if (model.modelType === LOCAL_SEMANTIC_MODEL && !specification.vocabularies.includes(id)) {
            specification.vocabularies.push(id);
          }
        }
      }
    }
  }

  private buildSpecificationHierarchyEntity(packageId: ModelIdentifier): SpecificationHierarchyEntity {
    const entity: SpecificationHierarchyEntity = {
      id: packageId,
      type: [MODEL_HIERARCHY_SPECIFICATION],
      modelType: this.projectModel[packageId].modelType,
      specificationId: packageId,
      label: this.projectModel[packageId].label,
      projectId: this.projectModel[packageId].projectId,
      vocabularies: [],
      applicationProfile: null,
      usedExternalSpecifications: [],
    };
    this.entities[packageId] = entity;
    return entity;
  }

  private buildVocabularyHierarchyEntity(modelId: ModelIdentifier, specificationId: ModelIdentifier): VocabularyHierarchyEntity {
    const entity: VocabularyHierarchyEntity = {
      id: modelId,
      type: [MODEL_HIERARCHY_VOCABULARY],
      modelType: this.projectModel[modelId].modelType,
      specificationId,
      label: this.projectModel[modelId].label,
      projectId: this.projectModel[modelId].projectId,
    };
    this.entities[modelId] = entity;
    return entity;
  }

  private buildApplicationProfileHierarchyEntity(modelId: ModelIdentifier, specificationId: ModelIdentifier): ApplicationProfileHierarchyEntity {
    const entity: ApplicationProfileHierarchyEntity = {
      id: modelId,
      type: [MODEL_HIERARCHY_APPLICATION_PROFILE],
      modelType: this.projectModel[modelId].modelType,
      specificationId,
      label: this.projectModel[modelId].label,
      projectId: this.projectModel[modelId].projectId,
      profiles: [],
    };
    this.entities[modelId] = entity;
    return entity;
  }
}
