import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { createSetEntityOperation, SetEntityOperationType, UpdateEntityOperationType, type SetEntityOperation, type UpdateEntityOperation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";

/**
 * For given model returns everything as blob.
 *
 * A resource may have several named storage blobs (the default one simply
 * called "model"). To represent a non-default blob as its own model, use an
 * id of the form `${resourceId}#${blobName}` - this class resolves the
 * resource id and blob name from it and reads/writes that particular blob,
 * while the model itself still has exactly one entity, keyed by its own
 * (full, possibly `#`-suffixed) id.
 */
export class BlobModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  /**
   * Id of the underlying resource, with any `#blobName` suffix stripped off.
   */
  protected readonly resourceId: string;

  /**
   * Name of the storage blob to read/write, or undefined for the default blob.
   */
  protected readonly blobName: string | undefined;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;

    const hashIndex = id.indexOf("#");
    this.resourceId = hashIndex === -1 ? id : id.slice(0, hashIndex);
    this.blobName = hashIndex === -1 ? undefined : id.slice(hashIndex + 1);
  }

  protected applyOperation(operation: Operation, mutableState: EntityRecord): void {
    if (operation.type === SetEntityOperationType) {
      const setOperation = operation as SetEntityOperation;
      if (setOperation.entity.id !== this.id) {
        throw new Error(`Blob model can only set entity with id \"${this.id}\".`);
      }
      mutableState[this.id] = setOperation.entity;
      return;
    }

    if (operation.type !== UpdateEntityOperationType) {
      throw new Error("Applying operations to blob model is not yet supported!");
    }

    const updateOperation = operation as UpdateEntityOperation;
    const currentEntity = mutableState[this.id];

    if (updateOperation.update.id !== this.id) {
      throw new Error(`Blob model can only update entity with id \"${this.id}\".`);
    }

    mutableState[this.id] = {
      ...currentEntity,
      ...updateOperation.update,
    };
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = await this.service.getResourceJsonData(this.resourceId, this.blobName) as object;
    if (!data) {
      return {
        entities: serializationToBlobModelEntities(this.id, {}),
        operations: [],
      };
    }

    const entities = serializationToBlobModelEntities(this.id, data);

    return {
      entities,
      operations: [],
    };
  }

  /**
   * A blob model always has exactly one entity even if empty.
   */
  protected override createNewInternal(): Operation[] {
    return [createSetEntityOperation(serializationToBlobModelEntities(this.id, {})[this.id]!)];
  }
}

export function createBlobModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new BlobModelInModelStore(modelId, context.service);
}
