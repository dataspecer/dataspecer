import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";

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
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";
import {
  createRelationshipProfileEnds,
  RelationshipProfileValues,
} from "./relationship-profile-utilities";

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

export const updateProfileRelationshipOperation: CmeOperation<
  UpdateProfileRelationshipArguments, UpdateProfileRelationshipResult> = {
  metadata: {
    type: UpdateProfileRelationshipType,
  },
  create: (_context, parameters) => ({
    type: UpdateProfileRelationshipType,
    ...parameters,
  }),
  execute: updateProfileRelationshipExecutor,
};

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
async function updateProfileRelationshipExecutor(
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
