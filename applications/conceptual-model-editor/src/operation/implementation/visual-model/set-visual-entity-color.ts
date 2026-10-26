import {
  HexColor,
  VisualNode,
  VisualProfileRelationship,
  VisualRelationship,
} from "@dataspecer/visual-model";

import {
  EntityDsIdentifier, ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationExecutionFailed,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import { findVisualModel } from "../operation-utilities";

export function setVisualEntityColorOperation(
  args: Omit<SetVisualEntityColorArguments, "type">,
): CmeOperation<SetVisualEntityColorArguments, SetVisualEntityColorResult> {
  return {
    type: SetVisualEntityColorType,
    ...args,
  };
}

interface SetVisualEntityColorArguments extends CmeOperationArguments {

  type: typeof SetVisualEntityColorType;

  visualModel: ModelDsIdentifier;

  /**
   * Identifiers of visual nodes and visual relationships to change.
   */
  visualEntities: EntityDsIdentifier[];

  /**
   * Use null to remove the custom color and use the model color.
   */
  color: HexColor | null;

}

const SetVisualEntityColorType =
  "set-visual-entity-color-operation";

type ColorableVisualEntity =
  VisualNode | VisualRelationship | VisualProfileRelationship;

type SetVisualEntityColorResult =
  CmeOperationResult<SetVisualEntityColorArguments>;

cmeOperationExecutorRegistry.register(
  SetVisualEntityColorType,
  setVisualEntityColorOperation,
  { execute: setVisualEntityColorExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function setVisualEntityColorExecutor(
  context: CmeExecutionContext,
  args: SetVisualEntityColorArguments,
): Promise<SetVisualEntityColorResult> {
  const model = findVisualModel(context, args.visualModel);

  // Check all entities first, so we do not change only some of them.
  for (const identifier of args.visualEntities) {
    if (model.getVisualEntity(identifier) === null) {
      throw new CmeOperationExecutionFailed();
    }
  }

  for (const identifier of args.visualEntities) {
    model.updateVisualEntity<ColorableVisualEntity>(
      identifier, { color: args.color });
  }

  return { args };
}
