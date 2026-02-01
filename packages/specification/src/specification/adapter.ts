import { AggregatorAsEntityModel, SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { CoreResourceReader } from "@dataspecer/core/core/index";
import { DataSpecification as LegacyDataSpecification } from "@dataspecer/core/data-specification/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { MemoryStoreFromBlob } from "../memory-store.ts";
import { ModelCompositionConfiguration, ModelCompositionConfigurationMerge } from "../model-hierarchy/composition-configuration.ts";
import { SemanticModelAggregatorBuilder } from "../model-hierarchy/semantic-model-aggregator-builder.ts";
import { loadAsStructureModel } from "../model-loader.ts";
import { WritableBlobModel } from "../model-repository/blob-model.ts";
import { CachedModelRepository } from "../model-repository/cached-model-repository.ts";
import { ModelRepository } from "../model-repository/model-repository.ts";
import { PackageModel } from "../model-repository/package-model.ts";
import { DataSpecification } from "./model.ts";
import { loadDataSpecifications } from "./utils.ts";

export async function getDataSpecification(packageAsSpecification: PackageModel): Promise<DataSpecification> {
  const subResources = await packageAsSpecification.getSubResources();

  const dataStructures = subResources
    .filter((r) => r.types.includes(V1.PSM))
    .map((ds) => ({
      id: ds.id,
      label: ds.getUserMetadata()?.label || {},
    }));

  const artifactConfigurations = subResources
    .filter((r) => r.types.includes(V1.GENERATOR_CONFIGURATION))
    .map((ds) => ({
      id: ds.id,
      label: ds.getUserMetadata()?.label || {},
    }));

  const model = ((await packageAsSpecification.getJsonBlob()) as any) ?? {};

  return {
    ...(await serializePackageModel(packageAsSpecification)),
    id: packageAsSpecification.id,
    type: LegacyDataSpecification.TYPE_DOCUMENTATION,

    label: packageAsSpecification.getUserMetadata()?.label || {},
    tags: [], // todo

    sourceSemanticModelIds: model.sourceSemanticModelIds ?? ["https://dataspecer.com/adapters/sgov"], // SGOV is default model if none is selected
    localSemanticModelIds: model.localSemanticModelIds ?? [],
    modelCompositionConfiguration: model.modelCompositionConfiguration ?? null,
    dataStructures,
    importsDataSpecificationIds: model.dataStructuresImportPackages ?? [],

    artifactConfigurations,

    userPreferences: model.userPreferences ?? {},
  };
}

async function serializePackageModel(packageModel: PackageModel): Promise<Package> {
  const subResources = [];
  for (const subResource of await packageModel.getSubResources()) {
    if (subResource.types.includes(LOCAL_PACKAGE)) {
      subResources.push(await serializePackageModel(await subResource.asPackageModel()));
    } else {
      subResources.push({
        iri: subResource.id,
        types: subResource.types,
        userMetadata: subResource.getUserMetadata() || {},
        metadata: null as any, // Metadata is not serialized in this context
      } as BaseResource);
    }
  }

  return {
    iri: packageModel.id,
    types: packageModel.types,
    userMetadata: packageModel.getUserMetadata() || {},
    metadata: null as any,
    linkedGitRepositoryURL: "",       // TODO RadStr PR: I don't know about this, probably should be specified
    projectIri: "",                   // TODO RadStr PR: I don't know about this, probably should be specified
    branch: "",                       // TODO RadStr PR: I don't know about this, probably should be specified
    representsBranchHead: true,       // TODO RadStr PR: I don't know about this, probably should be specified
    lastCommitHash: "",               // TODO RadStr PR: I don't know about this, probably should be specified
    activeMergeStateCount: 0,         // TODO RadStr PR: I don't know about this, probably should be specified
    hasUncommittedChanges: true,      // TODO RadStr PR: I don't know about this, probably should be specified


    subResources,
  };
}

/**
 * Returns the full data specification with all dependent specifications and models.
 */
export async function getDataSpecificationWithModels(dataSpecificationIri: string, dataPsmSchemaIri: string, modelRepository: ModelRepository) {
  const cachedModelRepository = new CachedModelRepository(modelRepository);
  const store = new FederatedObservableStore();

  let specifications: Record<string, DataSpecification>;
  let semanticModelAggregator!: SemanticModelAggregator;

  // All structure models are in FederatedObservableStore, but you can also access them directly
  const structureModels: Record<string, MemoryStoreFromBlob> = {};

  // Loads information about all projects/packages because they can reference each other
  specifications = await loadDataSpecifications(dataSpecificationIri, cachedModelRepository);
  await Promise.all(
    Object.values(specifications).map(async (specification) => {
      const model = (await cachedModelRepository.getModelById(specification.id))!;
      const pckg = await model.asPackageModel();

      const psmStores: MemoryStoreFromBlob[] = [];
      const subResources = await pckg.getSubResources();

      for (const subResource of subResources) {
        const model = await loadAsStructureModel(subResource);
        if (model) {
          psmStores.push(model);
          structureModels[subResource.id] = model;
        }
      }

      // Handle autosave
      for (const model of psmStores) {
        store.addStore(model);
        store.addEventListener("afterOperationExecuted", () => model.saveIfNewChanges());
      }

      let semanticModel: SemanticModelAggregator;
      let usedSemanticModels: InMemorySemanticModel[] = [];
      let compositionConfiguration = specification.modelCompositionConfiguration as ModelCompositionConfiguration | null;
      const builder = new SemanticModelAggregatorBuilder(pckg, fetch);
      if (compositionConfiguration) {
        semanticModel = await builder.build(compositionConfiguration);
      } else {
        semanticModel = await builder.build({
          modelType: "merge",
          models: null,
        } as ModelCompositionConfigurationMerge);
      }
      usedSemanticModels = builder.getUsedEntityModels();
      if (specification.id === dataSpecificationIri) {
        semanticModelAggregator = semanticModel;
      }

      const storeForFBS = new AggregatorAsEntityModel(semanticModel, specification.id) as unknown as CoreResourceReader;
      store.addStore(storeForFBS); // todo typings

      // This loop updates every semantic model
      // ! semantic model is updated twice!!
      for (const model of usedSemanticModels) {
        const id = model.getId();
        let hasUnsavedChanges = false;
        model.subscribeToChanges(() => {
          hasUnsavedChanges = true;
        });
        store.addEventListener("afterOperationExecuted", async () => {
          if (hasUnsavedChanges) {
            hasUnsavedChanges = false;

            const remoteModel = await cachedModelRepository.getModelById(id);
            const blobModel = (await remoteModel?.asBlobModel()) as WritableBlobModel | undefined;
            if (blobModel) {
              await blobModel.setJsonBlob(model.serializeModel());
            }
          }
        });
      }

      // @ts-ignore Each specification should have its own semantic model, not merged with other specifications
      specification.semanticModel = semanticModel;

      // Each specification may have multiple configurations, but in reality we use only the first one.
      const configurationStore = specification.artifactConfigurations?.[0]?.id ?? null;
      const configurationModel = configurationStore ? await (await cachedModelRepository.getModelById(configurationStore))?.asBlobModel() : undefined;
      const configuration = configurationModel ? ((await configurationModel.getJsonBlob()) as Record<string, object>) : {};
      // @ts-ignore This inserts the configuration into the specification
      specification.artefactConfiguration = configuration;
    }),
  );

  return {
    dataSpecifications: specifications,
    semanticModelAggregator,
    store: store as FederatedObservableStore,

    structureModels,
  };
}
