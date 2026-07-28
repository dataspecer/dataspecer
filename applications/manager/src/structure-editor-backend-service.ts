import { LOCAL_SEMANTIC_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { generateEntityId, type Entity } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type OperationInModel } from "@dataspecer/core/operation";
import { createCreateModelOperation, createCreateProjectOperation } from "@dataspecer/project-model";

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
   * Root package the service works with. Data specifications are not created
   * under it, as the location of a project is fixed.
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
    // The project, its models and their content are created by a single
    // transaction - the first one of the project's own history.
    const projectId = generateEntityId();

    const modelAlias = set?.label?.en ?? set?.label?.cs ?? "";

    const createProject = createCreateProjectOperation(projectId);
    createProject.label = set.label;

    const createPim = createCreateModelOperation(projectId, LOCAL_SEMANTIC_MODEL);
    createPim.label = { en: "Main Application Profile", cs: "Hlavní aplikační profil" };
    const createSgov = createCreateModelOperation(projectId, LOCAL_SEMANTIC_MODEL);
    createSgov.label = { en: "SGOV cache", cs: "SGOV cache" };
    const createConfiguration = createCreateModelOperation(projectId, V1.GENERATOR_CONFIGURATION);
    createConfiguration.label = { en: "Artifact configuration" };

    const operations: OperationInModel[] = [
      { modelId: PROJECT_MODEL_ID, operation: createProject },
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
        modelId: projectId,
        operation: createSetEntityOperation({
          id: projectId,
          type: [],
          modelCompositionConfiguration: {
            modelType: "application-profile",
            model: createPim.modelId,
            profiles: { modelType: "merge" },
          },
        } as Entity),
      },
    ];

    if (set.tags !== undefined) {
      // Tags are not part of the create operation, they are set as metadata of
      // the project in the project model.
      operations.push({
        modelId: PROJECT_MODEL_ID,
        operation: createSetEntityOperation({ id: projectId, type: [], tags: set.tags } as Entity),
      });
    }

    await this.applyTransactions(projectId, [{ id: generateOperationId(), operations }]);

    return projectId;
  }
}
