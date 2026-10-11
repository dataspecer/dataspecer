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

export function releaseSemanticClassSurroundingsOperation(
  args: Omit<ReleaseSemanticClassSurroundingsArguments, "type">,
): ReleaseSemanticClassSurroundingsArguments {
  return {
    type: ReleaseSemanticClassSurroundingsType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  ReleaseSemanticClassSurroundingsType,
  { execute: releaseClassSurroundingsExecutor },
)

export async function releaseClassSurroundingsExecutor(
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
