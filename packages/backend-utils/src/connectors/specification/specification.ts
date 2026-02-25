// @ts-nocheck due to circular dependencies
import { HttpStoreDescriptor, StoreDescriptor } from "../../store-descriptor/index.ts";
import { EntityModel } from "@dataspecer/core-v2";
import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { BackendPackageService, Package } from "@dataspecer/core-v2/project";
import { CoreResource, LanguageString } from "@dataspecer/core/core/core-resource";
import { DataSpecification as LegacyDataSpecification } from "@dataspecer/core/data-specification/model";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";

export type DataSpecification = Package & {
  /**
   * ID of the parent package that is being interpreted as Data Specification.
   */
  id: string;

  type: string;

  label: LanguageString;
  tags: string[];

  /**
   * List of IDs of models that are being interpreted as CIMs.
   * @deprecated Use {@link modelCompositionConfiguration} instead.
   * */
  sourceSemanticModelIds: string[];

  /**
   * List of IDs of models that are being interpreted as PIMs.
   * @deprecated Use {@link modelCompositionConfiguration} instead.
   */
  localSemanticModelIds: string[];

  /**
   * Information about models and how they are composed.
   * Overrides {@link sourceSemanticModelIds} and {@link localSemanticModelIds}.
   */
  modelCompositionConfiguration: object | null;

  dataStructures: DataSpecificationStructure[];

  importsDataSpecificationIds: string[];

  /**
   * This is a list of ids of models of type "Generator Configuration". You
   * should read the given model in oder to properly configure the artifact
   * generation.
   *
   * @todo There was this idea that we can have multiple artifact configurations
   * per data specification, but probably this was a mistake. Backend generator,
   * for example, uses the first one always. We should probably change this to a
   * single artifact configuration in the future.
   */
  artifactConfigurations: ArtifactConfigurationDescriptor[];

  /**
   * Additional data that can be used to store user preferences.
   */
  userPreferences: object;
};

export type DataSpecificationStructure = {
  id: string;
  label: LanguageString;
}

export type ArtifactConfigurationDescriptor = {
  id: string;
  label: LanguageString;
}

export class HttpSemanticModelStoreDescriptor implements StoreDescriptor {
  static readonly TYPE = "https://schemas.dataspecer.com/store-descriptor/semantic-model/http";

  type: typeof HttpSemanticModelStoreDescriptor.TYPE;

  url: string | null = null;

  modelId: string | null = null;

  isReadOnly: boolean;

  constructor() {
    this.type = HttpSemanticModelStoreDescriptor.TYPE;
    this.isReadOnly = true;
    this.url = null;
  }

  static is(storeDescriptor: StoreDescriptor): storeDescriptor is HttpSemanticModelStoreDescriptor {
    return storeDescriptor.type === HttpSemanticModelStoreDescriptor.TYPE;
  }
}

/**
 * This serves as an extension to the BackendPackageService that adds methods for operations on data specifications in structure editor.
 */
export class StructureEditorBackendService extends BackendPackageService {
  /**
   * Default root package id under which all data specifications are created by default.
   */
  protected readonly packageRoot: string;

  constructor(backendUrl: string, httpFetch: HttpFetch, packageRoot: string) {
    super(backendUrl, httpFetch);
    this.packageRoot = packageRoot;
  }

  public async readDefaultConfiguration(): Promise<object> {
    const data = await this.httpFetch(this.backendUrl + "/default-configuration");
    return await data.json() as object;
  }

  /**
   * Returns extended information for given package that is being interpreted as Data Specification.
   * @param dataSpecificationId ID of the package that is being interpreted as Data Specification.
   * @deprecated
   */
  public async getDataSpecification(dataSpecificationId: string): Promise<DataSpecification & Package> {
    const pckg = await this.getPackage(dataSpecificationId)!;

    const dataStructures = pckg.subResources.filter(r => r.types.includes(V1.PSM)).map(ds => ({
      id: ds.iri,
      label: ds.userMetadata?.label || {},
    }));

    const artifactConfigurations = pckg.subResources.filter(r => r.types.includes(V1.GENERATOR_CONFIGURATION)).map(ds => ({
      id: ds.iri,
      label: ds.userMetadata?.label || {},
    }));

    const model = await this.getResourceJsonData(dataSpecificationId) as any ?? {};

    return {
      ...pckg,
      id: pckg.iri,
      type: LegacyDataSpecification.TYPE_DOCUMENTATION,

      label: pckg.userMetadata?.label || {},
      tags: pckg.userMetadata?.tags || [],

      sourceSemanticModelIds: model.sourceSemanticModelIds ?? ["https://dataspecer.com/adapters/sgov"], // SGOV is default model if none is selected
      localSemanticModelIds: model.localSemanticModelIds ?? [],
      modelCompositionConfiguration: model.modelCompositionConfiguration ?? null,
      dataStructures,
      importsDataSpecificationIds: model.dataStructuresImportPackages ?? [],

      artifactConfigurations,

      userPreferences: model.userPreferences ?? {},
    };
  }

  /**
   * Returns information on how to fetch models for given data specification.
   */
  public getStoreDescriptorsForDataSpecification(dataSpecification: DataSpecification) {
    const pimStores = dataSpecification.localSemanticModelIds.map(id => {
      const store = new HttpSemanticModelStoreDescriptor();
      store.isReadOnly = false;
      store.modelId = id;
      return store;
    });

    const psmStores = Object.fromEntries(dataSpecification.dataStructures.map(ds => {
      const store = new HttpStoreDescriptor();
      store.isReadOnly = false;
      store.url = this.backendUrl + '/resources/blob?iri=' + encodeURIComponent(ds.id);
      return [ds.id, [store]];
    }));

    return {
      pimStores,
      psmStores,
    }
  }

  public async updateImportedDataSpecifications(dataSpecificationId: string, importedDataSpecificationIds: string[]): Promise<void> {
    const model = await this.getResourceJsonData(dataSpecificationId) as any ?? {};
    model.dataStructuresImportPackages = importedDataSpecificationIds;
    await this.setResourceJsonData(dataSpecificationId, model);
  }

  public async updateDefaultModelCompositionConfiguration(dataSpecificationId: string, modelCompositionConfiguration: any): Promise<void> {
    const model = await this.getResourceJsonData(dataSpecificationId) as any ?? {};
    model.modelCompositionConfiguration = modelCompositionConfiguration;
    await this.setResourceJsonData(dataSpecificationId, model);
  }

  public async getArtifactConfiguration(artifactConfigurationId: string): Promise<unknown> {
    return await this.getResourceJsonData(artifactConfigurationId);
  }

  public async updateArtifactConfiguration(artifactConfigurationId: string, configuration: object): Promise<void> {
    await this.setResourceJsonData(artifactConfigurationId, configuration);
  }

  /**
   * The last argument specifies whether the preferences should be overwritten or merged with the existing ones.
   * Default is merge.
   */
  public async updateUserPreferences(dataSpecificationId: string, preferences: object, overwrite: boolean = false): Promise<DataSpecification & Package> {
    const model = await this.getResourceJsonData(dataSpecificationId) as any ?? {};
    if (overwrite) {
      model.userPreferences = preferences;
    } else {
      model.userPreferences = {
        ...model.userPreferences,
        ...preferences,
      };
    }
    await this.setResourceJsonData(dataSpecificationId, model);
    return this.getDataSpecification(dataSpecificationId);
  }

  async constructSemanticModelFromIds(
    ids: string[]
  ): Promise<EntityModel[]> {
    const entityModels: EntityModel[] = [];
    for (const id of ids) {
      const resource = await this.getResource(id);
      const [[model]] = await this.getModelsFromResources([resource]);
      entityModels.push(model);
    }
    return entityModels;
  }

  /**
   * Creates new package with empty semantic model as PIM.
   */
  public async createDataSpecification(set: {tags?: string[], label?: LanguageString} = {}): Promise<DataSpecification & Package> {
    const pckg = await this.createPackage(this.packageRoot, {
      userMetadata: {
        tags: set.tags,
        label: set.label,
      }
    });

    const pim = await this.createResource(pckg.iri, {
      type: LOCAL_SEMANTIC_MODEL,
      userMetadata: {
        label: {
          "en": "Main Application Profile",
          "cs": "Hlavní aplikační profil",
        },
      }
    });
    await this.setResourceJsonData(pim.iri, {
      "type": "http://dataspecer.com/resources/local/semantic-model",
      "modelId": pim.iri,
      "modelAlias": set?.label.en ?? set?.label.cs ?? "",
      "entities": {}
    });

    const sgov = await this.createResource(pckg.iri, {
      type: LOCAL_SEMANTIC_MODEL,
      userMetadata: {
        label: {
          "en": "SGOV cache",
          "cs": "SGOV cache",
        },
      }
    });
    await this.setResourceJsonData(sgov.iri, {
      "type": "http://dataspecer.com/resources/local/semantic-model",
      "modelId": sgov.iri,
      "modelAlias": set?.label.en ?? set?.label.cs ?? "",
      "caches": ["https://dataspecer.com/adapters/sgov"],
      "entities": {}
    });

    await this.setResourceJsonData(pckg.iri, {
      modelCompositionConfiguration: {
        modelType: "application-profile",
        model: pim.iri,
        profiles: { modelType: "merge" },
      }
    });

    const configuration = await this.createResource(pckg.iri, {
      type: V1.GENERATOR_CONFIGURATION,
      userMetadata: {
        label: {
          "en": "Artifact configuration",
        }
      }
    });
    await this.setResourceJsonData(configuration.iri, {});

    return this.getDataSpecification(pckg.iri);
  }

  public async createDataStructure(dataSpecificationIri: string): Promise<{
    dataSpecification: DataSpecification & Package,
    createdPsmSchemaIri: string,
  }> {
    const resource = await this.createResource(dataSpecificationIri, {
      type: V1.PSM,
    });

    await this.setResourceJsonData(resource.iri, {
      operations: [],
      resources: {
        [resource.iri]: {
          "types": [
              "https://ofn.gov.cz/slovník/psm/Schema"
          ],
          "iri": resource.iri,
          "dataPsmHumanLabel": null,
          "dataPsmHumanDescription": null,
          "dataPsmTechnicalLabel": null,
          "dataPsmRoots": [],
          "dataPsmParts": []
        }
      }
    });

    const dataSpecification = await this.getDataSpecification(dataSpecificationIri);
    return {
      dataSpecification,
      createdPsmSchemaIri: resource.iri,
    };
  }

}