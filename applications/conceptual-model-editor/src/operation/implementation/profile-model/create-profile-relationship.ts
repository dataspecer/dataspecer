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

export function createProfileRelationshipOperation(
  args: Omit<CreateProfileRelationshipArguments, "type">,
): CreateProfileRelationshipArguments {
  return {
    type: CreateProfileRelationshipType,
    ...args,
  };
}

const CreateProfileRelationshipType =
  "create-profile-relationship-operation";

interface CreateProfileRelationshipArguments
  extends CmeOperationArguments, RelationshipProfileValues {

  type: typeof CreateProfileRelationshipType;

  profileModel: ModelDsIdentifier;

}

interface CreateProfileRelationshipResult
  extends CmeOperationResult<CreateProfileRelationshipArguments> {

  created: EntityDsIdentifier;

}

cmeOperationExecutorRegistry.register(
  CreateProfileRelationshipType,
  { execute: createProfileRelationshipExecutor });

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws CmeOperationExecutionFailed
 */
export async function createProfileRelationshipExecutor(
  context: CmeExecutionContext,
  args: CreateProfileRelationshipArguments,
): Promise<CreateProfileRelationshipResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.createRelationshipProfile({
    ends: createRelationshipProfileEnds(args),
  });

  const result = await executeCreateProfileOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
