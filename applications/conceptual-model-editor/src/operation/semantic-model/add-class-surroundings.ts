import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "@/dataspecer/entity-model";

import { CmeOperation, CmeOperationResult } from "../operation";
import { withModel } from "../operation-utilities";
import {
  CmeOperationContext,
  registerCmeOperationExecutor,
} from "../operation-executor-registry";
import { isExternalSemanticModel } from "../../dataspecer/semantic-model";

export interface AddClassSurroundingsOperation extends CmeOperation {

  type: typeof AddClassSurroundingsOperationType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

const AddClassSurroundingsOperationType =
  "add-class-surroundings-operation";

export function createAddClassSurroundingsOperation(
  value: Omit<AddClassSurroundingsOperation, "type">,
): AddClassSurroundingsOperation {
  return {
    type: AddClassSurroundingsOperationType,
    ...value,
  };
}

export type AddClassSurroundingsOperationResult =
  CmeOperationResult<AddClassSurroundingsOperation>;

export async function addClassSurroundingsOperationExecutor(
  context: CmeOperationContext,
  operation: AddClassSurroundingsOperation,
): Promise<AddClassSurroundingsOperationResult> {
  return withModel(isExternalSemanticModel, context.semanticModels,
    operation.semanticModel, async (model) => {
      await model.allowClassSurroundings(operation.entity);
      return { operation };
    });
}

registerCmeOperationExecutor(
  AddClassSurroundingsOperationType,
  addClassSurroundingsOperationExecutor,
  "Add semantic class surrounding",
  "For given semantic class add its surrounding to its semantic model."
);
