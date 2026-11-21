import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  CreatedEntityOperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

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

const CreateProfileRelationshipType =
  "create-profile-relationship-operation";

interface CreateProfileRelationshipArguments
  extends CmeOperationArguments, RelationshipProfileValues {

  type: typeof CreateProfileRelationshipType;

  /**
   * Identifier of the created entity.
   */
  identifier: EntityDsIdentifier;

  profileModel: ModelDsIdentifier;

}

interface CreateProfileRelationshipResult
  extends CmeOperationResult<CreateProfileRelationshipArguments> {

  created: EntityDsIdentifier;

}

export const createProfileRelationshipOperation: CmeOperation<
  CreateProfileRelationshipArguments, CreateProfileRelationshipResult,
  Omit<CreateProfileRelationshipArguments, "type" | "identifier">> = {
  metadata: {
    type: CreateProfileRelationshipType,
  },
  create: (context, parameters) => ({
    type: CreateProfileRelationshipType,
    ...parameters,
    identifier: context.createEntityIdentifier(parameters.profileModel),
  }),
  execute: createProfileRelationshipExecutor,
};

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
async function createProfileRelationshipExecutor(
  context: CmeExecutionContext,
  args: CreateProfileRelationshipArguments,
): Promise<CreateProfileRelationshipResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.createRelationshipProfile({
    id: args.identifier,
    ends: createRelationshipProfileEnds(args),
  });

  const result = await executeCreateProfileOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
