import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { InvalidModel, MissingModel } from "./operation";

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
