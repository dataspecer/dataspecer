import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, generateOperationId, type OperationInModel, type Transaction } from "@dataspecer/core/operation";
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
import { addJsonFileToBackup, createInMemoryBackup, type InMemoryBackupDirectory, type JsonObject } from "./import-backup.ts";
import { migrateInMemoryBackup } from "./migrations.ts";

const RESOURCE_METADATA_REGEX = /^([-0-9a-zA-Z]+)\.meta\.json$/;

/**
 * Metadata of one exported resource, see PackageExporter.
 */
interface ResourceMetadata {
  iri: string;
  metadata?: { modificationDate?: string };
  types?: string[];
  userMetadata?: Record<string, unknown> & { label?: LanguageString; description?: LanguageString };
}

const STORE_FILE_REGEX = /^\.([-0-9a-zA-Z]+)\.json$/;
const RESOURCE_STORE_FILE_REGEX = /^([-0-9a-zA-Z]+)\.([-0-9a-zA-Z]+)\.json$/;

/** Returns the name of an exported store file, if the file is a store. */
function getStoreName(fileName: string): string | null {
  const match = STORE_FILE_REGEX.exec(fileName) ?? RESOURCE_STORE_FILE_REGEX.exec(fileName);
  return match?.[match.length - 1] ?? null;
}

/** Returns the resource prefix for a store file stored beside its metadata. */
function getResourcePrefix(fileName: string): string | null {
  const match = RESOURCE_STORE_FILE_REGEX.exec(fileName);
  return match?.[1] ?? null;
}

/**
 * Creates the projects stored in an exported zip. The export is a snapshot
 * without any history, so each project is created by a single transaction of
 * operations that build the project structure and set the entities of the
 * models as they were exported.
 */
export class PackageImporter {
  private readonly modelRepository: ModelRepository;

  constructor(modelRepository: ModelRepository) {
    this.modelRepository = modelRepository;
  }

  /**
   * Imports the zip and returns the identifiers of the created projects.
   */
  async doImport(buffer: Buffer): Promise<string[]> {
    const backup = await this.loadArchive(buffer);
    migrateInMemoryBackup(backup);

    // Projects are the directories on the top level of the archive.
    const rootPackageDirectories = [...backup.directories.values()].filter((directory) => directory.files.has(".meta.json"));

    const transactions: Transaction[] = [];
    for (const directory of rootPackageDirectories) {
      const metadata = this.readMetadata(directory.files.get(".meta.json"));
      transactions.push({
        id: generateOperationId(),
        time: metadata.metadata?.modificationDate,
        operations: await this.createDirectoryOperations(directory, null),
      });
    }

    const operations = transactions.flatMap((transaction) => transaction.operations);
    const projectIds = operations.flatMap(({ operation }) => (isCreateProjectOperation(operation) ? [operation.projectId] : []));
    if (projectIds.length === 0) {
      return [];
    }

    await this.checkResourcesDoNotExist(operations);

    // Operations belonging to another project are routed to it by the
    // repository, so the project the transaction is sent to matters only as
    // the fallback for operations whose project cannot be resolved.
    await this.modelRepository.applyTransactions(projectIds[0]!, transactions);

    return projectIds;
  }

  /**
   * Creates operations for a package directory and recursively imports its
   * direct resources and sub-packages. A null parent means this is a project.
   */
  private async createDirectoryOperations(directory: InMemoryBackupDirectory, parentPackageId: string | null): Promise<OperationInModel[]> {
    const metadata = this.readMetadata(directory.files.get(".meta.json"));
    const stores = [...directory.files.entries()]
      .filter(([fileName]) => getResourcePrefix(fileName) === null)
      .flatMap(([fileName, data]) => {
        const storeName = getStoreName(fileName);
        return storeName === null || storeName === "meta" ? [] : [{ storeName, data }];
      });
    const operations = this.createResourceOperations(metadata, parentPackageId, stores, true);

    for (const [fileName, resourceMetadata] of directory.files) {
      const prefix = RESOURCE_METADATA_REGEX.exec(fileName)?.[1];
      if (prefix !== undefined) {
        const resourceStores = [...directory.files.entries()]
          .filter(([candidate]) => getResourcePrefix(candidate) === prefix)
          .flatMap(([candidate, data]) => {
            const storeName = getStoreName(candidate);
            return storeName === null || storeName === "meta" ? [] : [{ storeName, data }];
          });
        operations.push(...this.createResourceOperations(this.readMetadata(resourceMetadata), metadata.iri, resourceStores, false));
      }
    }

    for (const child of directory.directories.values()) {
      if (child.files.has(".meta.json")) {
        operations.push(...(await this.createDirectoryOperations(child, metadata.iri)));
      }
    }

    return operations;
  }

  private createResourceOperations(
    metadata: ResourceMetadata,
    parentPackageId: string | null,
    stores: { storeName: string; data: JsonObject }[],
    isPackageDirectory: boolean,
  ): OperationInModel[] {
    const iri = metadata.iri;
    const modelType = isPackageDirectory ? LOCAL_PACKAGE : (metadata.types?.[0] ?? "");
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

    for (const { storeName, data } of stores) {
      const modelId = composeModelId(iri, storeName);
      const entities = deserializeModelEntities(modelId, resolveStoreModelType(modelType, storeName), data);
      for (const entity of Object.values(entities)) {
        operations.push({ modelId, operation: createSetEntityOperation(entity) });
      }
    }

    return operations;
  }

  private readMetadata(data: unknown): ResourceMetadata {
    if (!data || typeof (data as any).iri !== "string") {
      throw new Error("Import backup is missing resource metadata.");
    }
    return data as unknown as ResourceMetadata;
  }

  /**
   * Loads and parses every archive file into the in-memory backup before
   * migrations or import operations run.
   */
  private async loadArchive(buffer: Buffer): Promise<InMemoryBackupDirectory> {
    const zip = new JSZip();
    await zip.loadAsync(buffer);

    const backup = createInMemoryBackup();
    await Promise.all(
      Object.entries(zip.files).map(async ([path, source]) => {
        if (source.dir) {
          return;
        }
        const parsed = JSON.parse(await source.async("text")) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error(`Import file "${path}" must contain a JSON object.`);
        }
        addJsonFileToBackup(backup, path, parsed as JsonObject);
      }),
    );
    return backup;
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
