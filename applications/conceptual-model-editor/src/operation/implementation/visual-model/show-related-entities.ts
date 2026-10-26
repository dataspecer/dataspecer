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
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  findWritableVisualModel,
  getAllEntities,
  getEntity,
} from "./visual-model-utilities";
import { addRelatedEntities } from "./visual-model-additions";

export function showRelatedEntitiesOperation(
  args: Omit<ShowRelatedEntitiesArguments, "type">,
): CmeOperation<ShowRelatedEntitiesArguments, ShowRelatedEntitiesResult> {
  return {
    type: ShowRelatedEntitiesType,
    ...args,
  };
}

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

cmeOperationExecutorRegistry.register(
  ShowRelatedEntitiesType,
  showRelatedEntitiesOperation,
  { execute: showRelatedEntitiesExecutor });

/**
 * @throws CmeOperationExecutionFailed
 */
export async function showRelatedEntitiesExecutor(
  context: CmeExecutionContext,
  args: ShowRelatedEntitiesArguments,
): Promise<ShowRelatedEntitiesResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const entity = getEntity(context, args.entity);
  addRelatedEntities(getAllEntities(context), visualModel, entity);
  return { args };
}
