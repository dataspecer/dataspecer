import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";

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
    return (await data.json()) as object;
  }

  /**
   * Creates new package with empty semantic model as PIM.
   * @returns Data specification ID
   */
  public async createDataSpecification(set: { tags?: string[]; label?: LanguageString } = {}): Promise<string> {
    const pckg = await this.createPackage(this.packageRoot, {
      userMetadata: {
        tags: set.tags,
        label: set.label,
      },
    });

    const pim = await this.createResource(pckg.iri, {
      type: LOCAL_SEMANTIC_MODEL,
      userMetadata: {
        label: {
          en: "Main Application Profile",
          cs: "Hlavní aplikační profil",
        },
      },
    });
    await this.setResourceJsonData(pim.iri, {
      type: "http://dataspecer.com/resources/local/semantic-model",
      modelId: pim.iri,
      modelAlias: set?.label?.en ?? set?.label?.cs ?? "",
      entities: {},
    });

    const sgov = await this.createResource(pckg.iri, {
      type: LOCAL_SEMANTIC_MODEL,
      userMetadata: {
        label: {
          en: "SGOV cache",
          cs: "SGOV cache",
        },
      },
    });
    await this.setResourceJsonData(sgov.iri, {
      type: "http://dataspecer.com/resources/local/semantic-model",
      modelId: sgov.iri,
      modelAlias: set?.label?.en ?? set?.label?.cs ?? "",
      caches: ["https://dataspecer.com/adapters/sgov"],
      entities: {},
    });

    await this.setResourceJsonData(pckg.iri, {
      modelCompositionConfiguration: {
        modelType: "application-profile",
        model: pim.iri,
        profiles: { modelType: "merge" },
      },
    });

    const configuration = await this.createResource(pckg.iri, {
      type: V1.GENERATOR_CONFIGURATION,
      userMetadata: {
        label: {
          en: "Artifact configuration",
        },
      },
    });
    await this.setResourceJsonData(configuration.iri, {});

    return pckg.iri;
  }

  public async createDataStructure(dataSpecificationIri: string): Promise<{
    createdPsmSchemaIri: string;
  }> {
    const resource = await this.createResource(dataSpecificationIri, {
      type: V1.PSM,
    });

    await this.setResourceJsonData(resource.iri, {
      operations: [],
      resources: {
        [resource.iri]: {
          types: ["https://ofn.gov.cz/slovník/psm/Schema"],
          iri: resource.iri,
          dataPsmHumanLabel: null,
          dataPsmHumanDescription: null,
          dataPsmTechnicalLabel: null,
          dataPsmRoots: [],
          dataPsmParts: [],
        },
      },
    });

    return {
      createdPsmSchemaIri: resource.iri,
    };
  }
}
