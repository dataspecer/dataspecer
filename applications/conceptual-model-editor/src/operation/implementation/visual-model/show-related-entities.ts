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
  getEntity,
} from "./visual-model-utilities";
import { addRelatedEntities } from "./visual-model-additions";

const ShowRelatedEntitiesType =
  "show-related-entities-operation";

interface ShowRelatedEntitiesArguments extends CmeOperationArguments {

  type: typeof ShowRelatedEntitiesType;

  visualModel: ModelDsIdentifier;

  /**
   * Class or class profile.
   */
  entity: EntityDsIdentifier;

}

type ShowRelatedEntitiesResult =
  CmeOperationResult<ShowRelatedEntitiesArguments>;

export const showRelatedEntitiesOperation: CmeOperation<
  ShowRelatedEntitiesArguments, ShowRelatedEntitiesResult> = {
  metadata: {
    type: ShowRelatedEntitiesType,
  },
  create: (_context, parameters) => ({
    type: ShowRelatedEntitiesType,
    ...parameters,
  }),
  execute: showRelatedEntitiesExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function showRelatedEntitiesExecutor(
  context: CmeExecutionContext,
  args: ShowRelatedEntitiesArguments,
): Promise<ShowRelatedEntitiesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const entity = getEntity(context, args.entity);
  addRelatedEntities(getAllEntities(context), visualModel, entity);
  return { args };
}
