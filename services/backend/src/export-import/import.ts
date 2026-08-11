import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type OperationInModel } from "@dataspecer/core/operation";
import {
  createCreateModelOperation,
  createCreateProjectOperation,
  isCreateModelOperation,
  isCreateProjectOperation,
  PROJECT_MODEL_MODEL_ENTITY,
} from "@dataspecer/core/project-model";
import JSZip from "jszip";
import { composeModelId, PROJECT_MODEL_ID } from "../models/model-id.ts";
import { ModelRepository } from "../models/model-repository.ts";
import { deserializeModelEntities, resolveStoreModelType } from "../models/model-types.ts";

const FILE_EXTENSION_REGEX = /^\.([-0-9a-zA-Z]+)\.json$/;
const RESOURCE_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+)\.meta\.json$/;
const PACKAGES_IN_PACKAGE_REGEX = /^([-0-9a-zA-Z]+\/)\.meta\.json$/;

/**
 * Metadata of one exported resource, see PackageExporter.
 */
interface ResourceMetadata {
  iri: string;
  types?: string[];
  userMetadata?: Record<string, unknown> & { label?: LanguageString; description?: LanguageString };
}

/**
 * Creates the projects stored in an exported zip. The export is a snapshot
 * without any history, so everything is created by a single transaction of
 * operations that build the project structure and set the entities of the
 * models as they were exported.
 */
export class PackageImporter {
  private readonly modelRepository: ModelRepository;
  private zip!: JSZip;

  constructor(modelRepository: ModelRepository) {
    this.modelRepository = modelRepository;
  }

  /**
   * Imports the zip and returns the identifiers of the created projects.
   */
  async doImport(buffer: Buffer): Promise<string[]> {
    this.zip = new JSZip();
    await this.zip.loadAsync(buffer);

    // Projects are the directories on the top level of the zip.
    const rootPackagePaths = Object.keys(this.zip.files)
      .filter((file) => file.endsWith("/.meta.json") && file.split("/").length === 2)
      .map((file) => file.split("/")[0] + "/");

    const operations: OperationInModel[] = [];
    for (const packagePath of rootPackagePaths) {
      operations.push(...(await this.createResourceOperations(packagePath, null)));
    }

    const projectIds = operations.flatMap(({ operation }) => (isCreateProjectOperation(operation) ? [operation.projectId] : []));
    if (projectIds.length === 0) {
      return [];
    }

    await this.checkResourcesDoNotExist(operations);

    // Operations belonging to another project are routed to it by the
    // repository, so the project the transaction is sent to matters only as
    // the fallback for operations whose project cannot be resolved.
    await this.modelRepository.applyTransactions(projectIds[0]!, [{ id: generateOperationId(), operations }]);

    return projectIds;
  }

  /**
   * Operations that create the resource exported under the given path, set the
   * content of all its stores and, for a package, create its sub-resources.
   *
   * @param resourcePath Path the resource is exported under; packages are
   * exported as directories, so their path ends with a slash.
   * @param parentPackageId Package to create the resource in. Null creates the
   * resource as a project.
   */
  private async createResourceOperations(resourcePath: string, parentPackageId: string | null): Promise<OperationInModel[]> {
    const isPackage = resourcePath.endsWith("/");
    const metadata = await this.readMetadata(resourcePath);
    const iri = metadata.iri;
    const modelType = isPackage ? LOCAL_PACKAGE : (metadata.types?.[0] ?? "");
    const { label, description, ...otherMetadata } = metadata.userMetadata ?? {};

    const createOperation = parentPackageId === null ? createCreateProjectOperation(iri) : createCreateModelOperation(parentPackageId, modelType, iri);
    createOperation.label = label;
    createOperation.description = description;

    const operations: OperationInModel[] = [{ modelId: PROJECT_MODEL_ID, operation: createOperation }];

    // Only the label and description are part of the creation operation, the
    // rest of the user metadata is set on the resource's project model entity.
    if (Object.keys(otherMetadata).length > 0) {
      const entity = { ...otherMetadata, id: iri, type: [PROJECT_MODEL_MODEL_ENTITY] } as Entity;
      operations.push({ modelId: PROJECT_MODEL_ID, operation: createSetEntityOperation(entity) });
    }

    operations.push(...(await this.createStoreOperations(resourcePath, iri, modelType)));

    if (isPackage) {
      for (const subResourcePath of this.subResourcePaths(resourcePath)) {
        operations.push(...(await this.createResourceOperations(subResourcePath, iri)));
      }
    }

    return operations;
  }

  /**
   * Operations that set the entities of every store exported for the resource.
   * A store is read as a model of the resource type and its entities are set
   * as they are - the export holds only the resulting state, so there is
   * nothing model specific operations could be derived from.
   */
  private async createStoreOperations(resourcePath: string, iri: string, modelType: string): Promise<OperationInModel[]> {
    const operations: OperationInModel[] = [];

    for (const file of Object.keys(this.zip.files)) {
      if (!file.startsWith(resourcePath)) {
        continue;
      }

      const storeName = FILE_EXTENSION_REGEX.exec(file.substring(resourcePath.length))?.[1];
      // meta is a special for metadata, it is not a store per se
      if (storeName === undefined || storeName === "meta") {
        continue;
      }

      const data = JSON.parse(await this.zip.file(file)!.async("text"));
      const modelId = composeModelId(iri, storeName);
      const entities = deserializeModelEntities(modelId, resolveStoreModelType(modelType, storeName), data);
      for (const entity of Object.values(entities)) {
        operations.push({ modelId, operation: createSetEntityOperation(entity) });
      }
    }

    return operations;
  }

  /**
   * Paths of the resources exported directly in the given package,
   * sub-packages included.
   */
  private subResourcePaths(packagePath: string): string[] {
    const paths: string[] = [];

    for (const file of Object.keys(this.zip.files)) {
      if (!file.startsWith(packagePath)) {
        continue;
      }

      const restPath = file.substring(packagePath.length);
      const name = RESOURCE_IN_PACKAGE_REGEX.exec(restPath)?.[1] ?? PACKAGES_IN_PACKAGE_REGEX.exec(restPath)?.[1];
      if (name !== undefined) {
        paths.push(packagePath + name);
      }
    }

    return paths;
  }

  private async readMetadata(resourcePath: string): Promise<ResourceMetadata> {
    return JSON.parse(await this.zip.file(resourcePath + ".meta.json")!.async("text"));
  }

  /**
   * Ensures none of the resources the operations create exists yet. Creation
   * operations are idempotent and would silently do nothing for an existing
   * resource, letting the imported content overwrite it.
   */
  private async checkResourcesDoNotExist(operations: OperationInModel[]): Promise<void> {
    for (const { operation } of operations) {
      const iri = isCreateProjectOperation(operation) ? operation.projectId : isCreateModelOperation(operation) ? operation.modelId : null;
      if (iri !== null && (await this.modelRepository.getResource(iri)) !== null) {
        throw new Error(`Cannot import resource "${iri}" because it already exists.`);
      }
    }
  }
}
