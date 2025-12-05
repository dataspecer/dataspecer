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

const ReleaseSemanticClassSurroundingsType =
  "release-class-surroundings-operation";

register(
  ReleaseSemanticClassSurroundingsType,
  releaseClassSurroundingsExecutor,
  "Release semantic class surrounding",
  "For given semantic class release its surrounding to its semantic model."
);

export interface ReleaseSemanticClassSurroundingsArguments
  extends CmeOperationArguments {

  type: typeof ReleaseSemanticClassSurroundingsType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

type ReleaseClassSurroundingsResult =
  CmeOperationResult<ReleaseSemanticClassSurroundingsArguments>;

export type ReleaseSemanticClassSurroundingsOperation = [
  ReleaseSemanticClassSurroundingsArguments, ReleaseClassSurroundingsResult];

export async function releaseClassSurroundingsExecutor(
  context: CmeExecutionContext,
  args: ReleaseSemanticClassSurroundingsArguments,
): Promise<ReleaseClassSurroundingsResult> {
  const model = findModel(
    context.semanticModels, isExternalSemanticModel, args.semanticModel);
  //
  await model.releaseClassSurroundings(args.entity);
  return { args };
}

