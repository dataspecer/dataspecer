import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidOperationArguments,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getVisualNode,
} from "./visual-model-utilities";

export function shiftAttributeOperation(
  args: Omit<ShiftAttributeArguments, "type">,
): ShiftAttributeArguments {
  return {
    type: ShiftAttributeType,
    ...args,
  };
}

const ShiftAttributeType =
  "shift-attribute-operation";

interface ShiftAttributeArguments extends CmeOperationArguments {

  type: typeof ShiftAttributeType;

  visualModel: ModelDsIdentifier;

  visualNode: string;

  attribute: EntityDsIdentifier;

  /**
   * Negative value moves the attribute up, positive down.
   * Must be an integer.
   */
  shift: number;

}

type ShiftAttributeResult =
  CmeOperationResult<ShiftAttributeArguments>;

cmeOperationExecutorRegistry.register(
  ShiftAttributeType,
  { execute: shiftAttributeExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function shiftAttributeExecutor(
  context: CmeExecutionContext,
  args: ShiftAttributeArguments,
): Promise<ShiftAttributeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const node = getVisualNode(visualModel, args.visualNode);
  const previous = node.content.indexOf(args.attribute);
  if (previous === -1) {
    throw new InvalidOperationArguments("Attribute is not in the node.");
  }
  const length = node.content.length;
  // We add a multiple of length to deal with negative values.
  const next = (((previous + args.shift) % length) + length) % length;
  const content = [...node.content];
  content.splice(previous, 1);
  content.splice(next, 0, args.attribute);
  visualModel.updateVisualEntity(node.id, { content });
  return { args };
}
