import {
  SemanticModel,
  SemanticOperation,
  SemanticOperationResult,
} from "@dataspecer/semantic-model";
import { ModelDsIdentifier } from "../../dataspecer/entity-model";
import {
  DataspecerOperationFailed,
  InvalidModel,
  MissingModel,
} from "../operation";
import { isInMemorySemanticModel } from "../../dataspecer/semantic-model";
import {
  ProfileModel,
  ProfileOperation,
  ProfileOperationResult,
} from "@dataspecer/profile-model";
import { isInMemoryProfileModel } from "../../dataspecer/profile-model";

/**
 * @throws MissingModel
 * @throws InvalidModel
 */
export function findSemanticModel(
  { semanticModels }: { semanticModels: SemanticModel[] },
  { semanticModel }: { semanticModel: ModelDsIdentifier },
) {
  return findModel(semanticModels, isInMemorySemanticModel, semanticModel)
}

/**
 * @throws MissingModel
 * @throws InvalidModel
 */
export function findModel<
  BaseModelType extends { getId(): string; },
  ModelType extends BaseModelType,
>(
  models: BaseModelType[],
  guard: (what: BaseModelType) => what is ModelType,
  identifier: ModelDsIdentifier,
): ModelType {
  for (const model of models) {
    if (model.getId() !== identifier) {
      continue;
    }
    if (guard(model)) {
      return model;
    }
    throw new InvalidModel();
  }
  throw new MissingModel(models, identifier);
}

/**
 * @throws MissingModel
 * @throws InvalidModel
 */
export function findProfileModel(
  { profileModels }: { profileModels: ProfileModel[] },
  { profileModel }: { profileModel: ModelDsIdentifier },
) {
  return findModel(profileModels, isInMemoryProfileModel, profileModel)
}

/**
 * @throws DataspecerOperationFailed
 */
export async function executeCreateSemanticOperation(
  model: {
    executeOperation: (operation: SemanticOperation) => SemanticOperationResult,
  },
  operation: SemanticOperation,
): Promise<SemanticOperationResult> {
  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerOperationFailed();
  }
  return result;
}

/**
 * @throws DataspecerOperationFailed
 */
export async function executeCreateProfileOperation(
  model: {
    executeOperation: (operation: ProfileOperation) => ProfileOperationResult,
  },
  operation: ProfileOperation,
): Promise<ProfileOperationResult> {
  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerOperationFailed();
  }
  return result;
}
