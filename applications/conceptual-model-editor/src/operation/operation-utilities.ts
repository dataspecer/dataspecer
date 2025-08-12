import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { InvalidModel, MissingModel } from "./operation";

/**
 * Execute given callback with model of given type and identifier.
 *
 * @throws MissingModel
 * @throws InvalidModel
 */
export function withModel<
  BaseModelType extends { getId(): string; },
  ModelType extends BaseModelType,
  ResultType,
>(
  guard: (what: BaseModelType) => what is ModelType,
  models: BaseModelType[], identifier: ModelDsIdentifier,
  callback: (model: ModelType) => ResultType,
) {
  const model = findModel(models, identifier);
  if (guard(model)) {
    return callback(model);
  } else {
    throw new InvalidModel();
  }
}

/**
 * @throws MissingModel
 */
export function findModel<ModelType extends { getId(): string; }>(
  models: ModelType[], identifier: ModelDsIdentifier,
): ModelType {
  for (const model of models) {
    if (model.getId() !== identifier) {
      continue;
    }
    return model;
  }
  throw new MissingModel(models, identifier);
}
