import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  MissingModel,
} from "../../operation";
import {
  findWritableVisualModel,
  getAllEntities,
  getEntityModels,
  getWritableVisualModels,
} from "./visual-model-utilities";
import { isClassOrClassProfile } from "./visual-model-additions";
import {
  collectDirectVisualEntitiesToRemove,
  collectInvalidVisualDiagramNodeEdges,
  removeVisualEntities,
} from "./visual-model-removal";

const HideSemanticModelType =
  "hide-semantic-model-operation";

interface HideSemanticModelArguments extends CmeOperationArguments {

  type: typeof HideSemanticModelType;

  visualModel: ModelDsIdentifier;

  semanticModel: ModelDsIdentifier;

}

type HideSemanticModelResult =
  CmeOperationResult<HideSemanticModelArguments>;

export const hideSemanticModelOperation: CmeOperation<
  HideSemanticModelArguments, HideSemanticModelResult> = {
  metadata: {
    type: HideSemanticModelType,
  },
  create: (_context, parameters) => ({
    type: HideSemanticModelType,
    ...parameters,
  }),
  execute: hideSemanticModelExecutor,
};

/**
 * Connected edges are removed together with the nodes.
 *
 * @throws CmeOperationExecutionFailed
 */
async function hideSemanticModelExecutor(
  context: CmeExecutionContext,
  args: HideSemanticModelArguments,
): Promise<HideSemanticModelResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const model = getEntityModels(context)
    .find(item => item.getId() === args.semanticModel);
  if (model === undefined) {
    throw new MissingModel();
  }
  const classes = Object.values(model.getEntities())
    .filter(isClassOrClassProfile)
    .map(item => item.id);

  const direct = collectDirectVisualEntitiesToRemove(
    visualModel, classes,
    identifier => visualModel.getVisualEntitiesForRepresented(identifier));
  const indirect = collectInvalidVisualDiagramNodeEdges(
    getAllEntities(context).map(item => item.entity),
    getWritableVisualModels(context), visualModel, classes);
  removeVisualEntities(visualModel, direct.concat(indirect));
  return { args };
}
