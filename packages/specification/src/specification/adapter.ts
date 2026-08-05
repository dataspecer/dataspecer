import { AggregatorAsEntityModel, type ApplicationProfileAggregator, type SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { DataSpecification as LegacyDataSpecification } from "@dataspecer/core/data-specification/model";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { isPackageEntity, type ProjectModelEntity, type PackageEntity } from "@dataspecer/core/project-model";
import { build, isSemanticModelType } from "../model-hierarchy/semantic-model-aggregator-builder.ts";
import { DataSpecification } from "./model.ts";
import { TransactionMetadata } from "@dataspecer/model-store";
import { OperationInModel } from "@dataspecer/core/operation";
import type { MemoryStore } from "@dataspecer/core/core";

const PROJECT_MODEL_ID: ModelIdentifier = "_project_model";

/**
 * For given project ID it returns a connection to the data specification.
 *
 * @param projectId The ID of the package that is being worked on
 * @param models All models needed to build the specification.
 */
export function getDataSpecificationWithModels(
  projectId: ModelIdentifier,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange?: (changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void,

  addOperationForTransaction?: (operations: OperationInModel[]) => void,
  commitTransaction?: (metadata: TransactionMetadata) => void,
) {
  if (!addOperationForTransaction || !commitTransaction) {
    const fallback = () => console.error("Model is in a read only mode, you cannot execute operations on it.");
    addOperationForTransaction = fallback;
    commitTransaction = fallback;
  }
  const store = new FederatedObservableStore(addOperationForTransaction, commitTransaction);
  const dataStructureIds: string[] = [];

  onChange?.((change) => {
    for (const [modelId, changesForModel] of Object.entries(change)) {
      if (dataStructureIds.includes(modelId)) {
        store.updateModel(modelId, changesForModel);
      }
    }
  });

  const executeOperation = (modelId: ModelIdentifier, operation: any) => addOperationForTransaction([{ modelId, operation }]);

  const projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ProjectModelEntity>;
  const dataSpecifications = loadDataSpecifications(projectId, projectModel, models);

  for (const specification of Object.values(dataSpecifications)) {
    for (const structures of specification.dataStructures) {
      store.addModel(structures.id, models[structures.id] ?? {});
      dataStructureIds.push(structures.id);
    }

    let configuration: any = {};
    const configurationId = specification.artifactConfigurations[0]?.id;
    if (configurationId) {
      configuration = models[configurationId]?.[configurationId] ?? {};
    }

    // @ts-ignore This inserts the configuration into the specification
    specification.artefactConfiguration = configuration;
  }

  // Every package has its own semantic model. All of them are registered so
  // that entities interpreting structures can be read no matter which package
  // of the project they come from. Nested packages are registered after the
  // packages containing them, so that entities are read from the model that is
  // the closest one to them.
  const semanticModelAggregator = addSemanticModel(store, projectId, models, onChange, executeOperation);
  const semanticModels: Record<ModelIdentifier, SemanticModelAggregator> = { [projectId]: semanticModelAggregator };

  for (const packageId of listPackages(projectId, projectModel)) {
    if (packageId === projectId || !hasSemanticModel(packageId, projectModel)) {
      continue;
    }
    try {
      semanticModels[packageId] = addSemanticModel(store, packageId, models, onChange, executeOperation);
    } catch (error) {
      // A package that cannot be aggregated must not prevent the rest of the
      // project from being used.
      console.error(`Semantic model of the package '${packageId}' could not be built.`, error);
    }
  }

  const projectSemanticModels = Object.values(semanticModels);
  for (const specification of Object.values(dataSpecifications)) {
    // @ts-ignore This inserts the semantic model of the specification
    specification.semanticModel = semanticModels[specification.id];
    // A structure may be interpreted by entities of another package, for
    // example when it references a structure of another specification.
    // @ts-ignore This inserts the semantic models of the whole project
    specification.projectSemanticModels = projectSemanticModels;
  }

  return {
    dataSpecifications,
    semanticModelAggregator,
    store,

    structureModels: {} as Record<string, MemoryStore>,
  };
}

/**
 * Builds the semantic model of the specification and registers its aggregated
 * entities in the store, keeping them up to date.
 *
 * @returns The aggregator the registered entities come from.
 */
function addSemanticModel(
  store: FederatedObservableStore,
  specificationId: ModelIdentifier,
  models: Record<ModelIdentifier, EntityRecord>,
  onChange: ((changeListener: (changes: Record<ModelIdentifier, EntityChange[]>) => void) => () => void) | undefined,
  executeOperation: (modelId: ModelIdentifier, operation: any) => void,
): SemanticModelAggregator {
  const aggregator = build(specificationId, models, onChange, executeOperation);

  // We need to add the model as the lowest level model because some operations
  // want to modify the profiled entities directly.
  const modelId = (aggregator as ApplicationProfileAggregator).profileId ?? specificationId;

  const asEntityModel = new AggregatorAsEntityModel(aggregator, modelId);
  const previousModel = { ...asEntityModel.getEntities() };
  store.addModel(modelId, { ...previousModel });
  asEntityModel.subscribeToChanges((updated, removed) => {
    const changes: EntityChange[] = [];
    for (const [id, entity] of Object.entries(updated)) {
      changes.push({
        previous: previousModel[id] ?? null,
        next: entity as any,
      });
      previousModel[id] = entity as any;
    }
    for (const id of removed) {
      changes.push({
        previous: previousModel[id]!,
        next: null,
      });
      delete previousModel[id];
    }

    store.updateModel(modelId, changes);
  });

  return aggregator;
}

/**
 * Identifiers of the package and of all packages nested in it, the package
 * itself first, followed by the packages it contains. Projects that are reused
 * are part of the project structure as sub-packages, hence they are listed as
 * well.
 */
function listPackages(rootPackageId: ModelIdentifier, projectModel: EntityRecord<ProjectModelEntity>): ModelIdentifier[] {
  const packages: ModelIdentifier[] = [];

  const visited = new Set<ModelIdentifier>();
  const toVisit = [rootPackageId];

  for (let i = 0; i < toVisit.length; i++) {
    const packageId = toVisit[i]!;
    if (visited.has(packageId)) {
      continue;
    }
    visited.add(packageId);

    const packageEntity = projectModel[packageId] as ProjectModelEntity | undefined;
    if (packageEntity === undefined || !isPackageEntity(packageEntity)) {
      // Models other than packages, and packages that are not part of the
      // project structure (anymore), are skipped.
      continue;
    }

    packages.push(packageId);
    toVisit.push(...packageEntity.subModels);
  }

  return packages;
}

/**
 * Whether there is anything to aggregate for the package, i.e. whether it or
 * any package nested in it contains a semantic model.
 */
function hasSemanticModel(packageId: ModelIdentifier, projectModel: EntityRecord<ProjectModelEntity>): boolean {
  return listPackages(packageId, projectModel).some((nestedPackageId) =>
    (projectModel[nestedPackageId] as PackageEntity).subModels.some((subModelId) => {
      const subModel = projectModel[subModelId];
      return subModel !== undefined && isSemanticModelType(subModel.modelType);
    }),
  );
}

/**
 * Loads a data specification for structure modeling. This means loading all
 * semantic models and structure models, including configuration, of the given
 * package and of all packages nested in it.
 *
 * Only packages that contain structures are specifications on their own, the
 * remaining ones are just a part of the hierarchy.
 */
function loadDataSpecifications(
  rootDataSpecificationId: ModelIdentifier,
  projectModel: EntityRecord<ProjectModelEntity>,
  models: Record<ModelIdentifier, EntityRecord>,
): Record<string, DataSpecification> {
  const dataSpecifications: { [iri: string]: DataSpecification } = {};

  for (const packageId of listPackages(rootDataSpecificationId, projectModel)) {
    const specification = getDataSpecification(packageId, projectModel, models[packageId] ?? (null as EntityRecord | null));
    if (specification.dataStructures.length > 0 || packageId === rootDataSpecificationId) {
      dataSpecifications[packageId] = specification;
    }
  }

  return dataSpecifications;
}


/**
 * Returns metadata about the data specification.
 * @param projectId The ID of the data specification (project).
 * @param projectModel The project model containing the full hierarchy of models inside the project.
 * @param rootModel The root model may contain configuration for the data specification.
 */
export function getDataSpecification(projectId: string, projectModel: EntityRecord<ProjectModelEntity>, rootModel: EntityRecord | null): DataSpecification & Package {
  const mainPackage = projectModel[projectId] as PackageEntity | undefined;
  const subResourceIds = mainPackage?.subModels ?? [];
  if (!rootModel) {
    console.error(`Package with ID ${projectId} has no root model.`);
  }
  const rawModelData: any = rootModel?.[projectId] ?? {};

  // Resolve actual resources from project model
  const subResources = subResourceIds.map((id) => projectModel[id]).filter((r) => r !== undefined);

  const dataStructures = subResources
    .filter((r) => r.modelType === V1.PSM)
    .map((ds) => ({
      id: ds.id,
      label: ds.label || {},
    }));

  const artifactConfigurations = subResources
    .filter((r) => r.modelType === V1.GENERATOR_CONFIGURATION)
    .map((ds) => ({
      id: ds.id,
      label: ds.label || {},
    }));

  return {
    ...projectModelToPackage(projectId, projectModel),

    id: projectId,
    type: LegacyDataSpecification.TYPE_DOCUMENTATION,

    label: mainPackage?.label || {},
    tags: [], // todo

    localSemanticModelIds: rawModelData.localSemanticModelIds ?? [],
    modelCompositionConfiguration: rawModelData.modelCompositionConfiguration ?? null,
    dataStructures,
    importsDataSpecificationIds: rawModelData.dataStructuresImportPackages ?? [],

    artifactConfigurations,

    userPreferences: rawModelData.userPreferences ?? {},
  };
}

/**
 * Obtains data from the project model and returns a legacy data structure about the package.
 * @todo do we need everything?
 */
function projectModelToPackage(packageId: string, projectModel: EntityRecord<ProjectModelEntity>): Package {
  const packageEntity = projectModel[packageId] as PackageEntity | undefined;
  const subResourceIds = packageEntity?.subModels ?? [];
  const subResources: BaseResource[] = [];

  for (const subResourceId of subResourceIds) {
    const subResource = projectModel[subResourceId];
    if (subResource) {
      if (subResource.modelType === LOCAL_PACKAGE) {
        subResources.push(projectModelToPackage(subResourceId, projectModel));
      } else {
        subResources.push({
          iri: subResource.id,
          types: [subResource.modelType],
          userMetadata: {
            label: subResource.label || {},
          },
          metadata: null as any,
        } as BaseResource);
      }
    }
  }

  return {
    iri: packageId,
    types: [packageEntity?.modelType ?? LOCAL_PACKAGE],
    userMetadata: {
      label: packageEntity?.label || {},
    },
    metadata: null as any,
    subResources,
  };
}