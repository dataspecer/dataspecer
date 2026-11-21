import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
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

export const hideByRepresentedOperation: CmeOperation<
  HideByRepresentedArguments, HideByRepresentedResult> = {
  metadata: {
    type: HideByRepresentedType,
  },
  create: (_context, parameters) => ({
    type: HideByRepresentedType,
    ...parameters,
  }),
  execute: hideByRepresentedExecutor,
};

/**
 * Edges from visual diagram nodes, which contain the hidden classes,
 * are removed as well.
 *
 * @throws CmeOperationExecutionFailed
 */
async function hideByRepresentedExecutor(
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
