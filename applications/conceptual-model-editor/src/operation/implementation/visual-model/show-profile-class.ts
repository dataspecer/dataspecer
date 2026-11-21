import {
  isSemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

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

const ShowProfileClassType =
  "show-profile-class-operation";

interface ShowProfileClassArguments extends CmeOperationArguments {

  type: typeof ShowProfileClassType;

  visualModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

  x: number;

  y: number;

}

interface ShowProfileClassResult
  extends CmeOperationResult<ShowProfileClassArguments> {

  created: string;

}

export const showProfileClassOperation: CmeOperation<
  ShowProfileClassArguments, ShowProfileClassResult> = {
  metadata: {
    type: ShowProfileClassType,
  },
  create: (_context, parameters) => ({
    type: ShowProfileClassType,
    ...parameters,
  }),
  execute: showProfileClassExecutor,
};

/**
 * The model of the node is the model owning the class profile.
 *
 * @throws CmeOperationExecutionFailed
 */
async function showProfileClassExecutor(
  context: CmeExecutionContext,
  args: ShowProfileClassArguments,
): Promise<ShowProfileClassResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const profile = getEntity(context, args.entity);
  if (!isSemanticModelClassProfile(profile.entity)) {
    throw new InvalidEntity("Expected a class profile.");
  }

  const entities = getAllEntities(context);
  const created = addVisualNodeForEntity(
    entities.map(item => item.entity), visualModel,
    profile.entity.id, profile.model, args, null);
  addRelatedEntities(entities, visualModel, profile);

  return { args, created };
}
