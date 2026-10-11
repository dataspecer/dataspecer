import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";

import { isExternalSemanticModel } from "../../../dataspecer/semantic-model";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findSemanticModel } from "../operation-utilities";
import {
  CmeExecutionContext, CmeOperationArguments, CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";

export function addSemanticClassSurroundingsOperation(
  args: Omit<AddSemanticClassSurroundingsArguments, "type">,
): AddSemanticClassSurroundingsArguments {
  return {
    type: AddSemanticClassSurroundingsType,
    ...args,
  };
}

interface AddSemanticClassSurroundingsArguments extends CmeOperationArguments {

  type: typeof AddSemanticClassSurroundingsType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

const AddSemanticClassSurroundingsType =
  "add-class-surroundings-operation";

type AddClassSurroundingsResult =
  CmeOperationResult<AddSemanticClassSurroundingsArguments>;

cmeOperationExecutorRegistry.register(
  AddSemanticClassSurroundingsType,
  { execute: addSemanticClassSurroundingsExecutor },
)

export async function addSemanticClassSurroundingsExecutor(
  context: CmeExecutionContext,
  args: AddSemanticClassSurroundingsArguments,
): Promise<AddClassSurroundingsResult> {
  const model = findSemanticModel(context, args.semanticModel);
  if (!isExternalSemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  await model.allowClassSurroundings(args.entity);
  return { args };
}
