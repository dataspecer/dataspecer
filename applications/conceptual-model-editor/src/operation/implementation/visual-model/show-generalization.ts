import {
  isSemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getEntity,
} from "./visual-model-utilities";
import { addVisualConnection } from "./visual-model-additions";

export function showGeneralizationOperation(
  args: Omit<ShowGeneralizationArguments, "type">,
): CmeOperation<ShowGeneralizationArguments, ShowGeneralizationResult> {
  return {
    type: ShowGeneralizationType,
    ...args,
  };
}

const ShowGeneralizationType =
  "show-generalization-operation";

interface ShowGeneralizationArguments extends CmeOperationArguments {

  type: typeof ShowGeneralizationType;

  visualModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

interface ShowGeneralizationResult
  extends CmeOperationResult<ShowGeneralizationArguments> {

  /**
   * False when the child or the parent is not in the visual model.
   */
  shown: boolean;

}

cmeOperationExecutorRegistry.register(
  ShowGeneralizationType,
  showGeneralizationOperation,
  { execute: showGeneralizationExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function showGeneralizationExecutor(
  context: CmeExecutionContext,
  args: ShowGeneralizationArguments,
): Promise<ShowGeneralizationResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const { entity, model } = getEntity(context, args.entity);
  if (!isSemanticModelGeneralization(entity)) {
    throw new InvalidEntity("Expected a generalization.");
  }
  const shown = addVisualConnection(visualModel, entity, model);
  return { args, shown };
}
