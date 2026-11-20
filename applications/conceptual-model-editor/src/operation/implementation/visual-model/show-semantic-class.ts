import {
  isSemanticModelClass,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
  InvalidEntity,
} from "../../operation";
import {
  findWritableVisualModel,
  getAllEntities,
  getEntity,
} from "./visual-model-utilities";
import {
  addRelatedEntities,
  addVisualNodeForEntity,
} from "./visual-model-additions";

const ShowSemanticClassType =
  "show-semantic-class-operation";

interface ShowSemanticClassArguments extends CmeOperationArguments {

  type: typeof ShowSemanticClassType;

  visualModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  x: number;

  y: number;

}

interface ShowSemanticClassResult
  extends CmeOperationResult<ShowSemanticClassArguments> {

  created: string;

}

export const showSemanticClassOperation: CmeOperation<
  ShowSemanticClassArguments, ShowSemanticClassResult> = {
  metadata: {
    type: ShowSemanticClassType,
  },
  create: (_context, parameters) => ({
    type: ShowSemanticClassType,
    ...parameters,
  }),
  execute: showSemanticClassExecutor,
};

/**
 * Add a visual node for the class, with all its attributes as content,
 * and connect it to related entities already in the visual model.
 * The model of the node is the model owning the class.
 *
 * @throws CmeOperationExecutionFailed
 */
async function showSemanticClassExecutor(
  context: CmeExecutionContext,
  args: ShowSemanticClassArguments,
): Promise<ShowSemanticClassResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const semanticClass = getEntity(context, args.entity);
  if (!isSemanticModelClass(semanticClass.entity)) {
    throw new InvalidEntity("Expected a class.");
  }

  const entities = getAllEntities(context);
  const created = addVisualNodeForEntity(
    entities.map(item => item.entity), visualModel,
    semanticClass.entity.id, semanticClass.model, args, null);
  addRelatedEntities(entities, visualModel, semanticClass);

  return { args, created };
}
