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

export interface ReleaseSemanticClassSurroundingsArguments
  extends CmeOperationArguments {

  type: typeof ReleaseSemanticClassSurroundingsType;

  semanticModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

const ReleaseSemanticClassSurroundingsType =
  "release-class-surroundings-operation";

type ReleaseClassSurroundingsResult =
  CmeOperationResult<ReleaseSemanticClassSurroundingsArguments>;

export const releaseSemanticClassSurroundingsOperation: CmeOperation<
  ReleaseSemanticClassSurroundingsArguments, ReleaseClassSurroundingsResult> = {
  metadata: {
    type: ReleaseSemanticClassSurroundingsType,
  },
  create: (_context, parameters) => ({
    type: ReleaseSemanticClassSurroundingsType,
    ...parameters,
  }),
  execute: releaseClassSurroundingsExecutor,
};

async function releaseClassSurroundingsExecutor(
  context: CmeExecutionContext,
  args: ReleaseSemanticClassSurroundingsArguments,
): Promise<ReleaseClassSurroundingsResult> {
  const model = findSemanticModel(context, args.semanticModel);
  if (!isExternalSemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  await model.releaseClassSurroundings(args.entity);
  return { args };
}
