import { AggregatorAsEntityModel, type ApplicationProfileAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { DataSpecification as LegacyDataSpecification } from "@dataspecer/core/data-specification/model";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import type { ModelEntity, PackageEntity } from "@dataspecer/project-model";
import { MemoryStoreFromBlob } from "../memory-store.ts";
import { build } from "../model-hierarchy/semantic-model-aggregator-builder.ts";
import { DataSpecification } from "./model.ts";
import { TransactionMetadata } from "@dataspecer/model-store";
import { OperationInModel } from "@dataspecer/core/operation";

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
  const semanticModelAggregator = build(projectId, models, onChange, executeOperation) as ApplicationProfileAggregator;

  const dataSpecifications = loadDataSpecifications(projectId, models);

  for (const specification of Object.values(dataSpecifications)) {
    for (const structures of specification.dataStructures) {
      store.addModel(structures.id, models[structures.id]!);
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

  const semanticAsEntity = new AggregatorAsEntityModel(semanticModelAggregator, projectId);

  const previousModel = { ...semanticAsEntity.getEntities() };
  // We need to add the model as the lowest level model because some operations
  // want to modify the profiled entities directly.
  const aggregatorId = semanticModelAggregator.profileId;
  store.addModel(aggregatorId, { ...previousModel });
  semanticAsEntity.subscribeToChanges((updated, removed) => {
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

    store.updateModel(aggregatorId, changes);
  });

  // @ts-ignore
  dataSpecifications[projectId]!.semanticModel = semanticModelAggregator;

  return {
    dataSpecifications,
    semanticModelAggregator,
    store,

    structureModels: {} as Record<string, MemoryStoreFromBlob>,
  };
}

/**
 * Loads a data specification for structure modeling. This means loading all
 * semantic models and structure models, including configuration and all
 * imported data specifications.
 *
 * @todo Currently there are two ways how to "reference" specifications. One is
 * via explicit `importsDataSpecificationIds`, the other is via sub-packages.
 * This is due to historical reasons. The correct way is to use sub-packages.
 */
function loadDataSpecifications(rootDataSpecificationId: ModelIdentifier, models: Record<ModelIdentifier, EntityRecord>): Record<string, DataSpecification> {
  const dataSpecifications: { [iri: string]: DataSpecification } = {};

  const projectModel = models[PROJECT_MODEL_ID] as EntityRecord<ModelEntity>;

  const specificationToLoad = [rootDataSpecificationId];

  for (let i = 0; i < specificationToLoad.length; i++) {
    const specificationId = specificationToLoad[i]!;
    if (dataSpecifications[specificationId]) {
      // This specification is already loaded, so we can skip it
      continue;
    }
    const specificationPackageEntity = projectModel[specificationId] as PackageEntity;

    const specification = getDataSpecification(specificationId, projectModel, models[specificationId] ?? (null as EntityRecord | null));

    if (specification?.dataStructures.length === 0 && specificationId !== rootDataSpecificationId) {
      // This specification is empty, so we can safely skip it
      continue;
    }

    if (specification) {
      dataSpecifications[specificationId] = specification;

      /**
       * @todo Individual packages should not be used to find imports. This should
       * be the correct way that one "package" is hidden under the other. Of
       * course, we can then employ something like symbolic links to point to
       * other specifications, but this would be considered as explicit hack.
       */
      specificationToLoad.push(...specification.importsDataSpecificationIds);
      specificationToLoad.push(...(specificationPackageEntity.subModels ?? []));
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
export function getDataSpecification(projectId: string, projectModel: EntityRecord<ModelEntity>, rootModel: EntityRecord | null): DataSpecification & Package {
  const mainPackage = projectModel[projectId] as PackageEntity;
  const subResourceIds = mainPackage.subModels ?? [];
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

    label: mainPackage.label || {},
    tags: [], // todo

    sourceSemanticModelIds: rawModelData.sourceSemanticModelIds ?? ["https://dataspecer.com/adapters/sgov"], // SGOV is default model if none is selected
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
function projectModelToPackage(packageId: string, projectModel: EntityRecord<ModelEntity>): Package {
  const packageEntity = projectModel[packageId] as PackageEntity;
  const subResourceIds = packageEntity.subModels ?? [];
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
    iri: packageEntity.id,
    types: [packageEntity.modelType],
    userMetadata: {
      label: packageEntity.label || {},
    },
    metadata: null as any,
    subResources,
  };
}