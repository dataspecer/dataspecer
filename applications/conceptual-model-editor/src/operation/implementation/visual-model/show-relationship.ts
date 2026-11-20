import {
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelRelationshipProfile,
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
  getEntity,
} from "./visual-model-utilities";
import { addVisualConnection } from "./visual-model-additions";

const ShowRelationshipType =
  "show-relationship-operation";

interface ShowRelationshipArguments extends CmeOperationArguments {

  type: typeof ShowRelationshipType;

  visualModel: ModelDsIdentifier;

  /**
   * Relationship or relationship profile.
   */
  entity: EntityDsIdentifier;

}

interface ShowRelationshipResult
  extends CmeOperationResult<ShowRelationshipArguments> {

  /**
   * False when an end of the relationship is not in the visual model.
   */
  shown: boolean;

}

export const showRelationshipOperation: CmeOperation<
  ShowRelationshipArguments, ShowRelationshipResult> = {
  metadata: {
    type: ShowRelationshipType,
  },
  create: (_context, parameters) => ({
    type: ShowRelationshipType,
    ...parameters,
  }),
  execute: showRelationshipExecutor,
};

/**
 * @throws CmeOperationExecutionFailed
 */
async function showRelationshipExecutor(
  context: CmeExecutionContext,
  args: ShowRelationshipArguments,
): Promise<ShowRelationshipResult> {
  const visualModel = findWritableVisualModel(context, args.visualModel);
  const { entity, model } = getEntity(context, args.entity);
  if (!isSemanticModelRelationship(entity)
    && !isSemanticModelRelationshipProfile(entity)) {
    throw new InvalidEntity("Expected a relationship or a relationship profile.");
  }
  const shown = addVisualConnection(visualModel, entity, model);
  return { args, shown };
}
