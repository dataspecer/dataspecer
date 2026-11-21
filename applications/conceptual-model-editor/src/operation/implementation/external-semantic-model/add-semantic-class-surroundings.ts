import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";

import { isExternalSemanticModel } from "../../../dataspecer/semantic-model";
import { findSemanticModel } from "../operation-utilities";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";

interface AddSemanticClassSurroundingsArguments extends CmeOperationArguments {

  type: typeof AddSemanticClassSurroundingsType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

const AddSemanticClassSurroundingsType =
  "add-class-surroundings-operation";

type AddClassSurroundingsResult =
  CmeOperationResult<AddSemanticClassSurroundingsArguments>;

export const addSemanticClassSurroundingsOperation: CmeOperation<
  AddSemanticClassSurroundingsArguments, AddClassSurroundingsResult> = {
  metadata: {
    type: AddSemanticClassSurroundingsType,
  },
  create: (_context, parameters) => ({
    type: AddSemanticClassSurroundingsType,
    ...parameters,
  }),
  execute: addSemanticClassSurroundingsExecutor,
};

async function addSemanticClassSurroundingsExecutor(
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
