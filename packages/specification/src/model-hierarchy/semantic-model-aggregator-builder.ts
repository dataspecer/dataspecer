import {
  ApplicationProfileAggregator,
  ExternalModelWithCacheAggregator,
  MergeAggregator,
  SemanticModelAggregator,
  VocabularyAggregator
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModelData } from "@dataspecer/visual-model";
import { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "./composition-configuration.ts";
import { getProvidedSourceSemanticModel } from "./adapter.ts";
import { loadAsSemanticModel, loadAsVisualModel } from "../model-loader.ts";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { PackageModel } from "../model-repository/package-model.ts";

// todo until colors are properly generated from model metadata

const DEFAULT_COLOR = "#4998f9";
const DEFAULT_VOCABULARY_COLOR = "#f9aa49";

function mergeIfNecessary(models: SemanticModelAggregator[]): SemanticModelAggregator {
  if (models.length === 1) {
    return models[0]!;
  } else {
    return new MergeAggregator(models);
  }
}

type rawModelsType = {
  model: {
    entities: Record<string, SemanticModelEntity>;
  },
  otherModels: {
    entities: Record<string, SemanticModelEntity>;
  }[];
};

/**
 * Builder of the semantic model aggregator from the configuration.
 */
export class SemanticModelAggregatorBuilder {
  private knownModels: Record<string, InMemorySemanticModel> = {};
  private modelData: Record<string, VisualModelData> = {};

  /**
   * Helper set to keep track of used models for the option to use all remaining models.
   */
  private usedModels: Set<InMemorySemanticModel> = new Set();
  private readonly packageModel: PackageModel;
  private readonly httpFetch: HttpFetch;

  constructor(packageModel: PackageModel, httpFetch: HttpFetch) {
    this.packageModel = packageModel;
    this.httpFetch = httpFetch;
  }

  /**
   * Loads all semantic models from the package and all its sub-packages recursively.
   *
   * This method is private as this is currently a workaround. In the future, each model should state which models it depends on and the aggregator should be built based on that.
   */
  private async recursivelyLoadAllModels(packageModel: PackageModel): Promise<void> {
    const subResources = await packageModel.getSubResources();
    await Promise.all(subResources.map(async (resource) => {
      const trySemanticModel = await loadAsSemanticModel(resource, this.httpFetch);
      if (trySemanticModel) {
        this.knownModels[trySemanticModel.getId()] = trySemanticModel as InMemorySemanticModel;
      }

      const tryVisualModel = await loadAsVisualModel(resource, this.httpFetch);
      if (tryVisualModel) {
        Object.assign(this.modelData, Object.fromEntries(tryVisualModel.getModelsData()));
      }

      if (resource.types.includes(LOCAL_PACKAGE)) {
        const pckg = await resource.asPackageModel();
        await this.recursivelyLoadAllModels(pckg);
      }
    }));
  }

  async build(configuration: ModelCompositionConfiguration): Promise<SemanticModelAggregator> {
    this.knownModels = {};
    this.usedModels = new Set();
    this.modelData = {};

    await this.recursivelyLoadAllModels(this.packageModel);

    const result = await this.buildRecursive(configuration);

    // Handle rawModels metadata
    {
      const rawModels: rawModelsType = {
        model: {
          entities: {},
        },
        otherModels: [],
      };

      for (const [knownModelId, knownModel] of Object.entries(this.knownModels)) {
        const subResources = await this.packageModel.getSubResources();
        if (subResources.find(res => res.id === knownModelId)) {
          Object.assign(rawModels.model.entities, knownModel.getEntities());
        } else {
          rawModels.otherModels.push({ entities: knownModel.getEntities() as Record<string, SemanticModelEntity> });
        }
      }

      (result as any)["rawModels"] = rawModels;
    }

    return result;
  }

  getUsedEntityModels(): InMemorySemanticModel[] {
    return [...this.usedModels];
  }

  /**
   * This is temporary implementation of algorithm that will take all models and from the deepest ones starts creating aggregated models.
   */
  private async constructRestFromModels(models: InMemorySemanticModel[]) {
    const iris = models.map((model) => model.getId());
    iris.sort((a, b) => b.split("/").length - a.split("/").length);

    const knownAggregatorsForPrefixes: Record<string, SemanticModelAggregator> = {}; // ends with slash

    const processAllModelsWithPrefix = async (iri: string) => { // ends with slash
      const thisModels = models.filter((model) => model.getId().startsWith(iri) && !model.getId().substring(iri.length).includes("/"));
      let thisAggregators: SemanticModelAggregator[];
      if (iri === "") {
        thisAggregators = Object.entries(knownAggregatorsForPrefixes).filter(([prefix]) => prefix.match(/^[^\/]+\/[^\/]+\//s)).map(([_, model]) => model);
      } else {
        thisAggregators = Object.entries(knownAggregatorsForPrefixes).filter(([prefix]) => prefix.startsWith(iri) && !prefix.substring(iri.length, prefix.length - 1).includes("/")).map(([_, model]) => model);
      }

      const profile = thisModels.find((model) => model.getId().endsWith("/profile"));
      const thisModelsAggregatorsWithoutProfile = await Promise.all(thisModels.filter((model) => model !== profile).map((model) => this.buildRecursive(model.getId())));
      // Create merge model
      const mergeModel = mergeIfNecessary([...thisAggregators, ...thisModelsAggregatorsWithoutProfile]);

      let result: SemanticModelAggregator;
      if (profile) {
        result = new ApplicationProfileAggregator(profile, mergeModel);
        ((result as ApplicationProfileAggregator).thisVocabularyChain as any)["color"] = this.modelData[profile.getId() as string]?.color ?? DEFAULT_VOCABULARY_COLOR;
        result = mergeIfNecessary([result, mergeModel]);
      } else {
        result = mergeModel;
      }

      knownAggregatorsForPrefixes[iri] = result;
    }

    let lastDept = 100;
    for (const iri of iris) {
      const withoutLastSlash = iri.substring(0, iri.lastIndexOf("/") + 1);
      const depth = withoutLastSlash.split("/").length;
      if (depth !== lastDept) {
        lastDept = depth;
      }
      if (!knownAggregatorsForPrefixes[withoutLastSlash]) {
        await processAllModelsWithPrefix(withoutLastSlash);
      }
    }

    const lastAggregators = Object.entries(knownAggregatorsForPrefixes).filter(([prefix]) => prefix.split("/").length === lastDept).map(([_, model]) => model);
    return mergeIfNecessary(lastAggregators);
  }

  private async buildRecursive(configuration: ModelCompositionConfiguration): Promise<SemanticModelAggregator> {
    if (!configuration) {
      throw new Error("Configuration is not defined.");
    } else if (typeof configuration === "string") {
      const model = this.knownModels[configuration]!;
      this.usedModels.add(model);
      if ((model.modelMetadata as any)?.["caches"]) { // Some models may not have metadata
        const cimAdapter = await getProvidedSourceSemanticModel((model.modelMetadata as any)["caches"]);
        const aggregator = new ExternalModelWithCacheAggregator(model, cimAdapter);
        (aggregator.thisVocabularyChain as any)["color"] = this.modelData[configuration]?.color ?? DEFAULT_VOCABULARY_COLOR;
        return aggregator;
      } else {
        const aggregator = new VocabularyAggregator(this.knownModels[configuration]!);
        (aggregator.thisVocabularyChain as any)["color"] = this.modelData[configuration]?.color ?? DEFAULT_VOCABULARY_COLOR;
        return aggregator;
      }
    } else if (configuration.modelType === "application-profile") {
      const profileConfig = configuration as ModelCompositionConfigurationApplicationProfile;
      const model = this.knownModels[profileConfig.model as string]!;
      this.usedModels.add(model!);
      const profiles = await this.buildRecursive(profileConfig.profiles);
      const aggregator = new ApplicationProfileAggregator(model, profiles, true).setCanAddEntities(profileConfig.canAddEntities ?? true).setCanModify(profileConfig.canModify ?? true);
      (aggregator.thisVocabularyChain as any)["color"] = this.modelData[profileConfig.model as string]?.color ?? DEFAULT_COLOR;
      return aggregator;
    } else if (configuration.modelType === "merge") {
      const mergeConfig = configuration as ModelCompositionConfigurationMerge;
      if (!mergeConfig.models) {
        // Use all remaining models
        const remainingModels = Object.values(this.knownModels).filter((model) =>
          [...this.usedModels].every((usedModel) => usedModel.getId() !== model.getId())
        ) as InMemorySemanticModel[];
        return await this.constructRestFromModels(remainingModels);
      } else {
        const models = await Promise.all(mergeConfig.models.map((model) => this.buildRecursive(model.model)));
        return new MergeAggregator(models);
      }
    } else {
      console.error(configuration);
      throw new Error("Unsupported model type for semantic model aggregator builder.");
    }
  }
}
