import {
  SemanticModel, SemanticOperation, SemanticOperationResult,
} from "@dataspecer/semantic-model";
import {
  ProfileModel, ProfileOperation, ProfileOperationResult,
} from "@dataspecer/profile-model";
import { WritableVisualModel } from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../../dataspecer/entity-model";
import {
  CmeExecutionContext, DataspecerOperationFailed, MissingModel,
  ModelIsNotWritable,
} from "../operation";
import { isInMemoryProfileModel } from "../../dataspecer/profile-model";
import { isInMemorySemanticModel } from "../../dataspecer/semantic-model";

/**
 * @throws MissingModel
 */
export function findSemanticModel(
  context: CmeExecutionContext, identifier: ModelDsIdentifier,
): SemanticModel {
  const model = context.semanticModels[identifier];
  if (model === undefined) {
    throw new MissingModel();
  }
  return model;
}

/**
 * @throws MissingModel
 */
export function findProfileModel(
  context: CmeExecutionContext, identifier: ModelDsIdentifier,
): ProfileModel {
  const model = context.profileModels[identifier];
  if (model === undefined) {
    throw new MissingModel();
  }
  return model;
}

/**
 * @throws MissingModel
 */
export function findVisualModel(
  context: CmeExecutionContext, identifier: ModelDsIdentifier,
): WritableVisualModel {
  const model = context.visualModels[identifier];
  if (model === undefined) {
    throw new MissingModel();
  }
  // We know there are no read only visual models.
  return model as WritableVisualModel;
}

/**
 * @throws ModelIsNotWritable
 * @throws DataspecerOperationFailed
 */
export async function executeCreateSemanticOperation(
  model: SemanticModel, operation: SemanticOperation,
): Promise<SemanticOperationResult> {
  if (!isInMemorySemanticModel(model)) {
    throw new ModelIsNotWritable();
  }
  const result = model.executeOperations([operation])[0];
  if (result.success === false) {
    throw new DataspecerOperationFailed();
  }
  return result;
}

/**
 * @throws ModelIsNotWritable
 * @throws DataspecerOperationFailed
 */
export async function executeCreateProfileOperation(
  model: ProfileModel, operation: ProfileOperation,
): Promise<ProfileOperationResult> {
  if (!isInMemoryProfileModel(model)) {
    throw new ModelIsNotWritable();
  }
  const result = model.executeOperations([operation])[0];
  if (result.success === false) {
    throw new DataspecerOperationFailed();
  }
  return result;
}
