import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "@/dataspecer/entity-model";

import { CmeOperationArguments, CmeOperationResult } from "../../operation";
import { findModel } from "../operation-utilities";
import {
  CmeExecutionContext,
  register,
} from "../../operation-registry";
import { isExternalSemanticModel } from "../../../dataspecer/semantic-model";

const AddSemanticClassSurroundingsType =
  "add-class-surroundings-operation";

register(
  AddSemanticClassSurroundingsType,
  addSemanticClassSurroundingsExecutor,
  "Add semantic class surrounding",
  "For given semantic class adds its surrounding to its semantic model."
);

interface AddSemanticClassSurroundingsArguments extends CmeOperationArguments {

  type: typeof AddSemanticClassSurroundingsType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

type AddClassSurroundingsResult =
  CmeOperationResult<AddSemanticClassSurroundingsArguments>;

export type AddSemanticClassSurroundingsOperation = [
  AddSemanticClassSurroundingsArguments, AddClassSurroundingsResult];

export async function addSemanticClassSurroundingsExecutor(
  context: CmeExecutionContext,
  args: AddSemanticClassSurroundingsArguments,
): Promise<AddClassSurroundingsResult> {
  const model = findModel(
    context.semanticModels, isExternalSemanticModel, args.semanticModel);
  //
  await model.allowClassSurroundings(args.entity);
  return { args };
}
