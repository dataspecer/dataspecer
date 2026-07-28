import { generateEntityId } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { generateOperationId, type Operation } from "@dataspecer/core/operation";

/**
 * @see {@link RemoveModelOperation}
 */
export const RemoveModelOperationType = "http://dataspecer.com/project-model/operation/remove-model" as const;

/**
 * Operation that ensures a model is removed from the project structure.
 *
 * If the model does not exist or was already removed, the operation is
 * ignored. If the removed model is a package, all of its submodels are removed
 * recursively as well.
 */
export interface RemoveModelOperation extends Operation {
  type: typeof RemoveModelOperationType;

  /**
   * Model to be removed by its identifier.
   */
  modelId: ModelIdentifier;
}

export function createRemoveModelOperation(modelId: ModelIdentifier): RemoveModelOperation {
  if (!(typeof modelId === "string" && modelId.length > 0)) {
    throw new Error("Invalid model identifier.");
  }

  return {
    id: generateOperationId(),
    type: RemoveModelOperationType,
    modelId,
  };
}

export function isRemoveModelOperation(operation: Operation): operation is RemoveModelOperation {
  return operation.type === RemoveModelOperationType;
}

/**
 * @see {@link CreateModelOperation}
 */
export const CreateModelOperationType = "http://dataspecer.com/project-model/operation/create-model" as const;

/**
 * Operation that ensures a model exists under the given package.
 *
 * This operation manipulates only the project structure metadata and does not
 * deal with model blobs.
 */
export interface CreateModelOperation extends Operation {
  type: typeof CreateModelOperationType;

  /**
   * Parent package identifier where the model should be created.
   */
  parentPackageId: ModelIdentifier;

  /**
   * Identifier of the model to be created.
   */
  modelId: ModelIdentifier;

  /**
   * Type of the model to create.
   */
  modelType: string;
}

/**
 * Creates a new operation that will create a new model. ID of such model is
 * pre-generated, but can be overridden by the caller.
 *
 * You need to specify model type.
 */
export function createCreateModelOperation(parentPackageId: ModelIdentifier, modelType: string, modelId?: ModelIdentifier): CreateModelOperation {
  return {
    id: generateOperationId(),
    type: CreateModelOperationType,
    parentPackageId,
    modelId: modelId ?? generateEntityId(),
    modelType,
  };
}

export function isCreateModelOperation(operation: Operation): operation is CreateModelOperation {
  return operation.type === CreateModelOperationType;
}

export type ProjectModelStructureOperation = RemoveModelOperation | CreateModelOperation;
