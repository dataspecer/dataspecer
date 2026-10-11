import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getAllEntities,
  getWritableVisualModels,
} from "./visual-model-utilities";
import {
  collectDirectVisualEntitiesToRemove,
  collectInvalidVisualDiagramNodeEdges,
  removeVisualEntities,
} from "./visual-model-removal";

export function hideByRepresentedOperation(
  args: Omit<HideByRepresentedArguments, "type">,
): HideByRepresentedArguments {
  return {
    type: HideByRepresentedType,
    ...args,
  };
}

const HideByRepresentedType =
  "hide-by-represented-operation";

interface HideByRepresentedArguments extends CmeOperationArguments {

  type: typeof HideByRepresentedType;

  visualModel: ModelDsIdentifier;

  /**
   * Identifiers of semantic or profile entities.
   */
  entities: EntityDsIdentifier[];

}

type HideByRepresentedResult =
  CmeOperationResult<HideByRepresentedArguments>;

cmeOperationExecutorRegistry.register(
  HideByRepresentedType,
  { execute: hideByRepresentedExecutor });

/**
 * Edges from visual diagram nodes, which contain the hidden classes,
 * are removed as well.
 *
 * @throws CmeOperationExecutionFailed
 */
export async function hideByRepresentedExecutor(
  context: CmeExecutionContext,
  args: HideByRepresentedArguments,
): Promise<HideByRepresentedResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const direct = collectDirectVisualEntitiesToRemove(
    visualModel, args.entities,
    identifier => visualModel.getVisualEntitiesForRepresented(identifier));
  const indirect = collectInvalidVisualDiagramNodeEdges(
    getAllEntities(context).map(item => item.entity),
    getWritableVisualModels(context), visualModel, args.entities);
  removeVisualEntities(visualModel, direct.concat(indirect));
  return { args };
}
