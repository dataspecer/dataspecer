import {
  EntityDsIdentifier,
  ModelDsIdentifier,
} from "@/dataspecer/entity-model";
import { SemanticProfileModelOperations } from "@dataspecer/profile-model";

import { CmeOperationArguments, CmeOperationResult } from "../../operation";
import { CmeExecutionContext, register } from "../../operation-registry";
import { findProfileModel } from "../operation-utilities";
import { Entity } from "@dataspecer/entity-model";

const ProfileEntitiesType = "profile-entities-operation";

register(
  ProfileEntitiesType,
  createDefaultProfilesExecutor,
  "Profile entities",
  "Create profiles for selected entities in the given model."
);

export interface ProfileEntities extends CmeOperationArguments {

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

type ProfileEntitiesResult = CmeOperationResult<ProfileEntities> & {

  classProfiles: EntityDsIdentifier[];

  relationshipProfiles: EntityDsIdentifier[];

  generalizationProfiles: EntityDsIdentifier[];

};

export type ProfileEntitiesOperation = [
  ProfileEntities, ProfileEntitiesResult];

export async function createDefaultProfilesExecutor(
  context: CmeExecutionContext,
  args: ProfileEntities,
): Promise<ProfileEntitiesResult> {
  // Collect entities.
  const entitiesToProfile: Entity[] = [];
  const models = new Set([
    ...context.semanticModels,
    ...context.profileModels,
  ]);
  for (const model of models) {
    const entities = model.getEntities();
    args.entities
      .map(identifier => entities[identifier])
      .filter(item => item !== undefined)
      .forEach(item => entitiesToProfile.push(item));
  }

  // Execute operation.
  const result = await SemanticProfileModelOperations.profileEntities({
    targetModel: findProfileModel(context, args),
  }, {
    entities: entitiesToProfile,
  });

  // Return result.
  return {
    args,
    classProfiles: result.classes,
    relationshipProfiles: result.relationships,
    generalizationProfiles: result.generalizations,
  };
}
