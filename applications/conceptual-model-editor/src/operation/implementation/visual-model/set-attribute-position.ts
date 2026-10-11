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

export function setAttributePositionOperation(
  args: Omit<SetAttributePositionArguments, "type">,
): SetAttributePositionArguments {
  return {
    type: SetAttributePositionType,
    ...args,
  };
}

const SetAttributePositionType =
  "set-attribute-position-operation";

interface SetAttributePositionArguments extends CmeOperationArguments {

  type: typeof SetAttributePositionType;

  visualModel: ModelDsIdentifier;

  visualNode: string;

  attribute: EntityDsIdentifier;

  position: number;

}

type SetAttributePositionResult =
  CmeOperationResult<SetAttributePositionArguments>;

cmeOperationExecutorRegistry.register(
  SetAttributePositionType,
  { execute: setAttributePositionExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function setAttributePositionExecutor(
  context: CmeExecutionContext,
  args: SetAttributePositionArguments,
): Promise<SetAttributePositionResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const node = getVisualNode(visualModel, args.visualNode);
  if (args.position < 0 || args.position >= node.content.length) {
    throw new InvalidOperationArguments("Invalid attribute position.");
  }
  const previous = node.content.indexOf(args.attribute);
  if (previous === -1) {
    throw new InvalidOperationArguments("Attribute is not in the node.");
  }
  const content = [...node.content];
  content.splice(previous, 1);
  content.splice(args.position, 0, args.attribute);
  visualModel.updateVisualEntity(node.id, { content });
  return { args };
}
