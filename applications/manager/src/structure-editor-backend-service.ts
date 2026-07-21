import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Entity } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type OperationInModel } from "@dataspecer/core/operation";
import { createCreateModelOperation } from "@dataspecer/project-model";

/**
 * Model id the backend uses to address operations that change the project
 * structure itself (creating/removing models), as opposed to a specific
 * model's own content.
 */
const PROJECT_MODEL_ID = "_project_model";

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
    // The package itself becomes a new project (its parent is the root
    // resource), so it cannot be created through operations: a project's
    // operation history cannot exist before the project does. Everything
    // created inside it, however, is created through a single transaction.
    const pckg = await this.createPackage(this.packageRoot, {
      userMetadata: {
        tags: set.tags,
        label: set.label,
      },
    });

    const modelAlias = set?.label?.en ?? set?.label?.cs ?? "";

    const createPim = createCreateModelOperation(pckg.iri, LOCAL_SEMANTIC_MODEL);
    const createSgov = createCreateModelOperation(pckg.iri, LOCAL_SEMANTIC_MODEL);
    const createConfiguration = createCreateModelOperation(pckg.iri, V1.GENERATOR_CONFIGURATION);

    const operations: OperationInModel[] = [
      { modelId: PROJECT_MODEL_ID, operation: createPim },
      { modelId: PROJECT_MODEL_ID, operation: createSgov },
      { modelId: PROJECT_MODEL_ID, operation: createConfiguration },
      {
        modelId: createPim.modelId,
        operation: createSetEntityOperation({
          id: createPim.modelId,
          type: [LOCAL_SEMANTIC_MODEL],
          modelAlias,
        } as Entity),
      },
      {
        modelId: createSgov.modelId,
        operation: createSetEntityOperation({
          id: createSgov.modelId,
          type: [LOCAL_SEMANTIC_MODEL],
          modelAlias,
          caches: ["https://dataspecer.com/adapters/sgov"],
        } as Entity),
      },
      {
        modelId: createConfiguration.modelId,
        operation: createSetEntityOperation({
          id: createConfiguration.modelId,
          type: [],
        }),
      },
      {
        modelId: pckg.iri,
        operation: createSetEntityOperation({
          id: pckg.iri,
          type: [],
          modelCompositionConfiguration: {
            modelType: "application-profile",
            model: createPim.modelId,
            profiles: { modelType: "merge" },
          },
        } as Entity),
      },
    ];

    await this.applyTransactions(pckg.iri, [{ id: generateOperationId(), operations }]);

    // CreateModelOperation carries no metadata, so the resources' labels are
    // set afterwards through the legacy metadata endpoint.
    await Promise.all([
      this.updatePackage(createPim.modelId, { userMetadata: { label: { en: "Main Application Profile", cs: "Hlavní aplikační profil" } } }),
      this.updatePackage(createSgov.modelId, { userMetadata: { label: { en: "SGOV cache", cs: "SGOV cache" } } }),
      this.updatePackage(createConfiguration.modelId, { userMetadata: { label: { en: "Artifact configuration" } } }),
    ]);

    return pckg.iri;
  }
}
