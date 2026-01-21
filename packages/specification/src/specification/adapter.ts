import { AggregatorAsEntityModel, SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { CoreResourceReader } from "@dataspecer/core/core/index";
import { DataSpecification as LegacyDataSpecification } from "@dataspecer/core/data-specification/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { PackageModel } from "../model-repository/package-model.ts";
import { DataSpecification } from "./model.ts";
import { ModelCompositionConfiguration, ModelCompositionConfigurationMerge } from "../model-hierarchy/composition-configuration.ts";
import { SemanticModelAggregatorBuilder } from "../model-hierarchy/semantic-model-aggregator-builder.ts";
import { MemoryStoreFromBlob } from "../memory-store.ts";
import { loadAsStructureModel } from "../model-loader.ts";
import { ModelRepository } from "../model-repository/model-repository.ts";
import { loadDataSpecifications } from "./utils.ts";
import { WritableBlobModel } from "../model-repository/blob-model.ts";


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

  const model = (await packageAsSpecification.getJsonBlob() as any) ?? {};

  return {
    ...await serializePackageModel(packageAsSpecification),
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

    subResources
  }

}

/**
 * Deep merges two configuration objects. Data spec configuration takes precedence.
 * This properly handles nested objects like useGenerators and renameArtifacts.
 */
function deepMergeConfigurations(semanticConfig: object, dataSpecConfig: object): object {
  const result: Record<string, any> = {...semanticConfig};
  
  for (const [key, value] of Object.entries(dataSpecConfig)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively merge nested objects
      result[key] = deepMergeConfigurations(
        (result[key] || {}) as object,
        value as object
      );
    } else {
      // Primitive values or arrays: data spec takes precedence
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Returns the full data specification with all dependent specifications and models.
 */
export async function getDataSpecificationWithModels(dataSpecificationIri: string, dataPsmSchemaIri: string, modelRepository: ModelRepository) {
  const store = new FederatedObservableStore();

  let specifications: Record<string, DataSpecification>;
  let semanticModelAggregator!: SemanticModelAggregator;

  specifications = await loadDataSpecifications(dataSpecificationIri, modelRepository);

  for (const specification of Object.values(specifications)) {
    const model = (await modelRepository.getModelById(specification.id))!;
    const pckg = await model.asPackageModel();

    const psmStores: MemoryStoreFromBlob[] = [];
    const subResources = await pckg.getSubResources();
    for (const subResource of subResources) {
      const model = await loadAsStructureModel(subResource);
      if (model) {
        psmStores.push(model);
      }
    }
    for (const model of psmStores) {
      store.addStore(model);
      store.addEventListener("afterOperationExecuted", () => model.save());
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

    // This loop updates every model
    for (const model of usedSemanticModels) {
      const id = model.getId();
      store.addEventListener("afterOperationExecuted", async () => {
        const remoteModel = await modelRepository.getModelById(id);
        const blobModel = await remoteModel?.asBlobModel() as WritableBlobModel | undefined;
        if (blobModel) {
          await blobModel.setJsonBlob(model.serializeModel());
        }
      });
    }

    // @ts-ignore Each specification should have its own semantic model, not merged with other specifications
    specification.semanticModel = semanticModel;

    // Load semantic model generator configuration (as defaults)
    let semanticModelConfiguration: object = {};
    if (usedSemanticModels.length > 0) {
      // Get configuration from the first semantic model (primary model)
      const primarySemanticModel = usedSemanticModels[0];
      if (primarySemanticModel) {
        const generatorConfig = primarySemanticModel.getGeneratorConfiguration();
        if (generatorConfig) {
          semanticModelConfiguration = generatorConfig;
        }
      }
    }

    // Load data specification configuration
    const configurationStore = specifications?.[dataSpecificationIri]?.artifactConfigurations?.[0]?.id ?? null;
    const configurationModel = configurationStore ? await (await modelRepository.getModelById(configurationStore))?.asBlobModel() : undefined;
    const dataSpecConfiguration: object = configurationModel ? ((await configurationModel.getJsonBlob()) as object) : {};

    // Merge semantic model configuration with data spec configuration
    // Data spec configuration takes precedence over semantic model configuration (deep merge)
    const mergedConfiguration = deepMergeConfigurations(semanticModelConfiguration, dataSpecConfiguration);

    if (specifications?.[dataSpecificationIri]) {
      // @ts-ignore
      specifications[dataSpecificationIri].artefactConfiguration = mergedConfiguration;
    }
  }

  return {
    dataSpecifications: specifications,
    semanticModelAggregator,
    store: store as FederatedObservableStore,
  };
}
