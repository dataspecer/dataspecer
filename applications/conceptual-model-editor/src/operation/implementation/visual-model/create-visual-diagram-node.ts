import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidOperationArguments,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  doesAddingVisualModelCauseSelfReference,
  findWritableVisualModel,
  getWritableVisualModels,
} from "./visual-model-utilities";

export function createVisualDiagramNodeOperation(
  args: Omit<CreateVisualDiagramNodeArguments, "type">,
): CreateVisualDiagramNodeArguments {
  return {
    type: CreateVisualDiagramNodeType,
    ...args,
  };
}

const CreateVisualDiagramNodeType =
  "create-visual-diagram-node-operation";

interface CreateVisualDiagramNodeArguments extends CmeOperationArguments {

  type: typeof CreateVisualDiagramNodeType;

  visualModel: ModelDsIdentifier;

  /**
   * Existing visual model represented by the node.
   */
  representedVisualModel: ModelDsIdentifier;

  x: number;

  y: number;

}

interface CreateVisualDiagramNodeResult
  extends CmeOperationResult<CreateVisualDiagramNodeArguments> {

  created: string;

}

cmeOperationExecutorRegistry.register(
  CreateVisualDiagramNodeType,
  { execute: createVisualDiagramNodeExecutor });

/**
 * @throws InvalidOperationArguments When the node would cause a cycle.
 * @throws CmeOperationExecutionFailed
 */
export async function createVisualDiagramNodeExecutor(
  context: CmeExecutionContext,
  args: CreateVisualDiagramNodeArguments,
): Promise<CreateVisualDiagramNodeResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  if (doesAddingVisualModelCauseSelfReference(
    getWritableVisualModels(context), visualModel, args.representedVisualModel)) {
    throw new InvalidOperationArguments(
      "Visual diagram node would cause self reference.");
  }
  const created = visualModel.addVisualDiagramNode({
    position: { x: args.x, y: args.y, anchored: null },
    representedVisualModel: args.representedVisualModel,
  });
  return { args, created };
}
