import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import { SemanticProfileModelOperations } from "@dataspecer/profile-model";
import { Entity } from "@dataspecer/core-v2";

import { findProfileModel } from "../operation-utilities";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  CmeExecutionContext, CmeOperationArguments, CmeOperationResult,
  ModelIsNotWritable,
} from "../../operation";
import { isInMemoryProfileModel } from "../../../dataspecer/profile-model";

export function profileEntitiesOperation(
  args: Omit<ProfileEntitiesArguments, "type">,
): ProfileEntitiesArguments {
  return {
    type: ProfileEntitiesType,
    ...args,
  };
}

export interface ProfileEntitiesArguments extends CmeOperationArguments {

  type: typeof ProfileEntitiesType;

  /**
   * Entities to profile.
   */
  entities: EntityDsIdentifier[];

  /**
   * Model to place the profiles into.
   */
  profileModel: ModelDsIdentifier;

}

const ProfileEntitiesType = "profile-entities-operation";

interface ProfileEntitiesResult
  extends CmeOperationResult<ProfileEntitiesArguments> {

  classProfiles: EntityDsIdentifier[];

  relationshipProfiles: EntityDsIdentifier[];

  generalizationProfiles: EntityDsIdentifier[];

};

cmeOperationExecutorRegistry.register(
  ProfileEntitiesType,
  { execute: createProfilesExecutor },
)

export async function createProfilesExecutor(
  context: CmeExecutionContext,
  args: ProfileEntitiesArguments,
): Promise<ProfileEntitiesResult> {

  // Collect entities to profile.
  const entities: Entity[] = [];
  Object.values(context.semanticModels).forEach(model => {
    args.entities
      .map(item => model.getEntities()[item])
      .filter(item => item !== undefined)
      .forEach(entity => entities.push(entity));
  });
  Object.values(context.profileModels).forEach(model => {
    args.entities
      .map(item => model.getEntities()[item])
      .filter(item => item !== undefined)
      .forEach(entity => entities.push(entity));
  });

  // Obtain model to save profiles into.
  const targetModel = findProfileModel(context, args.profileModel);
  if (!isInMemoryProfileModel(targetModel)) {
    throw new ModelIsNotWritable();
  }

  // Execute operation.
  const result = await SemanticProfileModelOperations.profileEntities(
    { targetModel }, { entities });

  // Return result.
  return {
    args,
    classProfiles: result.classes,
    relationshipProfiles: result.relationships,
    generalizationProfiles: result.generalizations,
  };
}
