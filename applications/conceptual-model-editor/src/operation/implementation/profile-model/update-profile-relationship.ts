import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";

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
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";
import {
  createRelationshipProfileEnds,
  RelationshipProfileValues,
} from "./relationship-profile-utilities";

export function updateProfileRelationshipOperation(
  args: Omit<UpdateProfileRelationshipArguments, "type">,
): UpdateProfileRelationshipArguments {
  return {
    type: UpdateProfileRelationshipType,
    ...args,
  };
}

const UpdateProfileRelationshipType =
  "update-profile-relationship-operation";

interface UpdateProfileRelationshipArguments
  extends CmeOperationArguments, RelationshipProfileValues {

  type: typeof UpdateProfileRelationshipType;

  profileModel: ModelDsIdentifier;

  entity: EntityDsIdentifier;

}

type UpdateProfileRelationshipResult =
  CmeOperationResult<UpdateProfileRelationshipArguments>;

cmeOperationExecutorRegistry.register(
  UpdateProfileRelationshipType,
  { execute: updateProfileRelationshipExecutor });

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
export async function updateProfileRelationshipExecutor(
  context: CmeExecutionContext,
  args: UpdateProfileRelationshipArguments,
): Promise<UpdateProfileRelationshipResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.modifyRelationshipProfile(args.entity, {
    ends: createRelationshipProfileEnds(args),
  });

  await executeCreateProfileOperation(model, operation);
  return { args };
}
