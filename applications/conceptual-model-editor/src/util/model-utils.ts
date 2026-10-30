import { type EntityModel } from "@dataspecer/core-v2/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";

export const sourceModelOfEntity = (entityId: string, models: EntityModel[]) => {
  return models.find((m) => Object.keys(m.getEntities()).find((eId) => eId === entityId));
};

export const filterInMemoryModels = (models: EntityModel[]) => {
  return models.filter((m): m is InMemorySemanticModel => m instanceof InMemorySemanticModel && !m.getMainEntity()?.source);
};

/**
 * Returns model type as a string to be shown in an entity detail for example.
 * @param model
 * @returns
 */
export const getModelType = (model: EntityModel | undefined | null) => {
  if (model instanceof InMemorySemanticModel && !model.getMainEntity()?.source) {
    return "local model";
  } else if (model instanceof ExternalSemanticModel) {
    return "external (sgov)";
  } else {
    return "from .ttl";
  }
};
