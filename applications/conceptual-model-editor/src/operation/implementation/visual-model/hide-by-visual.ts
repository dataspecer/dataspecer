import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { findWritableVisualModel } from "./visual-model-utilities";
import {
  collectDirectVisualEntitiesToRemove,
  removeVisualEntities,
} from "./visual-model-removal";

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

export const hideByVisualOperation: CmeOperation<HideByVisualArguments, HideByVisualResult> = {
  metadata: {
    type: HideByVisualType,
  },
  create: (_context, parameters) => ({
    type: HideByVisualType,
    ...parameters,
  }),
  execute: hideByVisualExecutor,
};

/**
 * Groups are reduced, a group left with a single member is removed.
 *
 * @throws CmeOperationExecutionFailed
 */
async function hideByVisualExecutor(
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
