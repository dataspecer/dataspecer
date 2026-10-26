import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findWritableVisualModel } from "./visual-model-utilities";
import {
  collectDirectVisualEntitiesToRemove,
  removeVisualEntities,
} from "./visual-model-removal";

export function hideByVisualOperation(
  args: Omit<HideByVisualArguments, "type">,
): CmeOperation<HideByVisualArguments, HideByVisualResult> {
  return {
    type: HideByVisualType,
    ...args,
  };
}

const HideByVisualType =
  "hide-by-visual-operation";

interface HideByVisualArguments extends CmeOperationArguments {

  type: typeof HideByVisualType;

  visualModel: ModelDsIdentifier;

  /**
   * Identifiers of visual entities.
   */
  visualEntities: string[];

}

type HideByVisualResult =
  CmeOperationResult<HideByVisualArguments>;

cmeOperationExecutorRegistry.register(
  HideByVisualType,
  hideByVisualOperation,
  { execute: hideByVisualExecutor });

/**
 * Groups are reduced, a group left with a single member is removed.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function hideByVisualExecutor(
  context: CmeExecutionContext,
  args: HideByVisualArguments,
): Promise<HideByVisualResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const toRemove = collectDirectVisualEntitiesToRemove(
    visualModel, args.visualEntities, identifier => {
      const visualEntity = visualModel.getVisualEntity(identifier);
      return visualEntity === null ? [] : [visualEntity];
    });
  removeVisualEntities(visualModel, toRemove);
  return { args };
}
