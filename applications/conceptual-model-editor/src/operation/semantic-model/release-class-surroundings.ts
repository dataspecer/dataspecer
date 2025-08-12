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

export interface ReleaseClassSurroundingsOperation extends CmeOperation {

  type: typeof ReleaseClassSurroundingsOperationType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

const ReleaseClassSurroundingsOperationType =
  "release-class-surroundings-operation";

export function createReleaseClassSurroundingsOperation(
  value: Omit<ReleaseClassSurroundingsOperation, "type">,
): ReleaseClassSurroundingsOperation {
  return {
    type: ReleaseClassSurroundingsOperationType,
    ...value,
  };
}

export type ReleaseClassSurroundingsOperationResult =
  CmeOperationResult<ReleaseClassSurroundingsOperation>;

export async function releaseClassSurroundingsOperationExecutor(
  context: CmeOperationContext,
  operation: ReleaseClassSurroundingsOperation,
): Promise<ReleaseClassSurroundingsOperationResult> {
  return withModel(isExternalSemanticModel, context.semanticModels,
    operation.semanticModel, async (model) => {
      await model.releaseClassSurroundings(operation.entity);
      return { operation };
    });
}

registerCmeOperationExecutor(
  ReleaseClassSurroundingsOperationType,
  releaseClassSurroundingsOperationExecutor,
  "Release semantic class surrounding",
  "For given semantic class release its surrounding to its semantic model."
);
