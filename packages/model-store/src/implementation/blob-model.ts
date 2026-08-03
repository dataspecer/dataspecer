import type { PackageService } from "@dataspecer/core-v2/project";
import { diffEntities, type EntityChange, type EntityRecord } from "@dataspecer/core/entity-model";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { isSetEntityOperation, isUpdateEntityOperation, type Operation } from "@dataspecer/core/operation";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

/**
 * For given model returns everything as blob.
 *
 * A resource may have several named storage blobs (the default one simply
 * called "model"). To represent a non-default blob as its own model, use an id
 * of the form `${resourceId}#${blobName}` - this class resolves the resource id
 * and blob name from it and reads/writes that particular blob, while the model
 * itself still has exactly one entity, keyed by its own (full, possibly
 * `#`-suffixed) id.
 */
export class BlobModelInModelStore implements ModelInModelStore {
  private readonly id: ModelIdentifier;
  private readonly service: PackageService;

  /**
   * Id of the underlying resource, with any `#blobName` suffix stripped off.
   */
  private readonly resourceId: string;

  /**
   * Name of the storage blob to read/write, or undefined for the default blob.
   */
  private readonly blobName: string | undefined;

  private state: EntityRecord = {};

  constructor(id: ModelIdentifier, service: PackageService) {
    this.id = id;
    this.service = service;

    const hashIndex = id.indexOf("#");
    this.resourceId = hashIndex === -1 ? id : id.slice(0, hashIndex);
    this.blobName = hashIndex === -1 ? undefined : id.slice(hashIndex + 1);
  }

  setState(coreState: EntityRecord): StateResult {
    const result = createStateResult(this.state, coreState);
    this.state = coreState;
    return result;
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const state = { ...this.state };
    const diff = applyOperationsToBlobModel(this.id, state, operations);
    this.state = state;
    return {
      coreState: state,
      outputState: state,
      diff,
    };
  }

  subscribeForAsyncChanges(): () => void {
    return () => {};
  }

  async getRemoteState(): Promise<EntityRecord> {
    const data = (await this.service.getResourceJsonData(this.resourceId, this.blobName)) as object;
    return serializationToBlobModelEntities(this.id, data ?? {});
  }
}

export function createBlobModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): BlobModelInModelStore {
  return new BlobModelInModelStore(modelId, context.service);
}

/**
 * Blob model supports only a single entity, which is the whole blob. Therefore
 * the set of operations is limited to just create and update.
 */
export function applyOperationsToBlobModel(modelId: ModelIdentifier, mutableModel: EntityRecord, operations: Operation[]): EntityChange[] {
  const previous: EntityRecord = { ...mutableModel };
  for (const operation of operations) {
    if (isSetEntityOperation(operation)) {
      if (operation.entity.id !== modelId) {
        throw new Error(`SetEntityOperation for blob model "${modelId}" must have entity id equal to the model id.`);
      }
      mutableModel[operation.entity.id] = operation.entity;
    } else if (isUpdateEntityOperation(operation)) {
      if (operation.update.id !== modelId) {
        throw new Error(`UpdateEntityOperation for blob model "${modelId}" must have update id equal to the model id.`);
      }
      const existingEntity = mutableModel[operation.update.id];
      // Per contract, if the entity does not exist, it is a soft fail - the operation is ignored.
      if (existingEntity) {
        mutableModel[operation.update.id] = { ...existingEntity, ...operation.update };
      }
    } else {
      throw new Error(`Unsupported operation type "${operation.type}" for blob model "${modelId}".`);
    }
  }
  return diffEntities(previous, mutableModel);
}
