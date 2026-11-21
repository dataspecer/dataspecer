import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidOperationArguments,
} from "../../operation";
import {
  findWritableVisualModel,
  getVisualNode,
} from "./visual-model-utilities";

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

export const setAttributePositionOperation: CmeOperation<
  SetAttributePositionArguments, SetAttributePositionResult> = {
  metadata: {
    type: SetAttributePositionType,
  },
  create: (_context, parameters) => ({
    type: SetAttributePositionType,
    ...parameters,
  }),
  execute: setAttributePositionExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function setAttributePositionExecutor(
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
