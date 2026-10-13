import {
  HexColor,
  isWritableVisualModel,
  VisualNode,
  VisualProfileRelationship,
  VisualRelationship,
} from "@dataspecer/visual-model";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeOperationArguments,
  CmeOperationExecutionFailed,
  CmeOperationResult,
} from "../../operation";
import {
  CmeExecutionContext,
  register,
} from "../../operation-registry";
import { findModel } from "../operation-utilities";

const SetVisualEntityColorType =
  "set-visual-entity-color-operation";

register(
  SetVisualEntityColorType,
  setVisualEntityColorExecutor,
  "Set visual entity color",
  "Set custom color of visual entities, overriding the model color."
);

interface SetVisualEntityColorArguments extends CmeOperationArguments {

  type: typeof SetVisualEntityColorType;

  visualModel: ModelDsIdentifier;

  /**
   * Identifiers of visual nodes and visual relationships to change.
   */
  visualEntities: EntityDsIdentifier[];

  /**
   * Hexadecimal color, for example "#ff0000".
   * Use null to remove the custom color and use the model color.
   */
  color: HexColor | null;

}

type ColorableVisualEntity =
  VisualNode | VisualRelationship | VisualProfileRelationship;

type SetVisualEntityColorResult =
  CmeOperationResult<SetVisualEntityColorArguments>;

export type SetVisualEntityColorOperation = [
  SetVisualEntityColorArguments, SetVisualEntityColorResult];

/**
 * @throws CmeOperationExecutionFailed
 */
export async function setVisualEntityColorExecutor(
  context: CmeExecutionContext,
  args: SetVisualEntityColorArguments,
): Promise<SetVisualEntityColorResult> {
  const model = findModel(
    context.visualModels, isWritableVisualModel, args.visualModel);

  // Check all entities first, so we do not change only some of them.
  for (const identifier of args.visualEntities) {
    if (model.getVisualEntity(identifier) === null) {
      throw new CmeOperationExecutionFailed(
        `Missing visual entity '${identifier}'.`);
    }
  }

  for (const identifier of args.visualEntities) {
    model.updateVisualEntity<ColorableVisualEntity>(
      identifier, { color: args.color });
  }
  return { args };
}
