import { isVisualGroup, WritableVisualModel } from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getVisualEntity,
  isVisualEdgeEnd,
} from "./visual-model-utilities";

export function toggleAnchorOperation(
  args: Omit<ToggleAnchorArguments, "type">,
): ToggleAnchorArguments {
  return {
    type: ToggleAnchorType,
    ...args,
  };
}

const ToggleAnchorType =
  "toggle-anchor-operation";

interface ToggleAnchorArguments extends CmeOperationArguments {

  type: typeof ToggleAnchorType;

  visualModel: ModelDsIdentifier;

  /**
   * Node, visual diagram node or group.
   */
  visualEntity: string;

  /**
   * When undefined the anchor is toggled, otherwise it is set to this value.
   */
  anchored?: true | null;

}

type ToggleAnchorResult =
  CmeOperationResult<ToggleAnchorArguments>;

cmeOperationExecutorRegistry.register(
  ToggleAnchorType,
  { execute: toggleAnchorExecutor });

/**
 * For a group the same value is set to all of its content.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function toggleAnchorExecutor(
  context: CmeExecutionContext,
  args: ToggleAnchorArguments,
): Promise<ToggleAnchorResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  setAnchor(visualModel, args.visualEntity, args.anchored);
  return { args };
}

/**
 * @throws CmeOperationExecutionFailed
 */
export function setAnchor(
  visualModel: WritableVisualModel,
  identifier: string,
  anchored: true | null | undefined,
): void {
  const visualEntity = getVisualEntity(visualModel, identifier);
  if (isVisualEdgeEnd(visualEntity)) {
    const next = anchored !== undefined ? anchored :
      (visualEntity.position.anchored === true ? null : true);
    visualModel.updateVisualEntity(visualEntity.id, {
      position: { ...visualEntity.position, anchored: next },
    });
  } else if (isVisualGroup(visualEntity)) {
    const next = anchored !== undefined ? anchored :
      (visualEntity.anchored === true ? null : true);
    visualModel.updateVisualEntity(visualEntity.id, { anchored: next });
    for (const item of visualEntity.content) {
      setAnchor(visualModel, item, next);
    }
  } else {
    throw new InvalidEntity("Expected a node or a group.");
  }
}
