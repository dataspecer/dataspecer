import { deleteEntity } from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { getEntityModels } from "../visual-model/visual-model-utilities";
import { InMemorySemanticModel } from "../../../dataspecer/profile-model";
import { cmeOperationExecutorRegistry } from "../../operation-registry";

export function deleteSemanticEntitiesOperation(
  args: Omit<DeleteSemanticEntitiesArguments, "type">,
): CmeOperation<DeleteSemanticEntitiesArguments, DeleteSemanticEntitiesResult> {
  return {
    type: DeleteSemanticEntitiesType,
    ...args,
  };
}

/**
 * TODO This action delete both from visual and from profile models.
 */
interface DeleteSemanticEntitiesArguments extends CmeOperationArguments {

  type: typeof DeleteSemanticEntitiesType;

  entities: {
    identifier: EntityDsIdentifier,
    model: ModelDsIdentifier,
  }[];

}

const DeleteSemanticEntitiesType =
  "delete-semantic-entities-operation";

interface DeleteSemanticEntitiesResult
  extends CmeOperationResult<DeleteSemanticEntitiesArguments> {

  /**
   * Entities which could not be deleted.
   * Failure of one entity does not stop deletion of others.
   *
   * TODO This should be split into multiple operations.
   */
  failed: {
    identifier: EntityDsIdentifier,
    model: ModelDsIdentifier,
  }[];

}

cmeOperationExecutorRegistry.register(
  DeleteSemanticEntitiesType,
  deleteSemanticEntitiesOperation,
  { execute: deleteSemanticEntitiesExecutor });

/**
 * Entities are not removed from visual models,
 * use the hide operations for that.
 */
export async function deleteSemanticEntitiesExecutor(
  context: CmeExecutionContext,
  args: DeleteSemanticEntitiesArguments,
): Promise<DeleteSemanticEntitiesResult> {
  const models = getEntityModels(context);
  const failed: DeleteSemanticEntitiesResult["failed"] = [];
  for (const item of args.entities) {
    const model = models.find(model => model.getId() === item.model);
    if (model instanceof InMemorySemanticModel && !model.getMainEntity()?.source) {
      const result = model.executeOperation(deleteEntity(item.identifier));
      if (!result.success) {
        failed.push(item);
      }
    } else if (model instanceof ExternalSemanticModel) {
      try {
        await model.releaseClass(item.identifier);
      } catch (error) {
        failed.push(item);
      }
    } else {
      failed.push(item);
    }
  }
  return { args, failed };
}
