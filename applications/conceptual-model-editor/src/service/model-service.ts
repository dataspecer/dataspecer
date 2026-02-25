import { type Entities, type EntityModel } from "@dataspecer/core-v2/entity-model";

import { t } from "../application/";

/**
 * Given a model create a human readable label.
 * As there is only one label, this function ignore active language.
 */
export function getModelLabel(model: EntityModel | undefined | null): string {
  if (model === undefined || model === null) {
    return "";
  }
  const alias = model.getAlias();
  if (alias !== null) {
    return alias;
  }
  return t("model-service.model-label-from-id", model.getId());
}

/**
 * @deprecated This is very slow and should not be used!
 */
export const findSourceModelOfEntity = (
  entityIdentifier: string,
  models: Map<string, EntityModel>,
): EntityModel | null => {
  for (const model of models.values()) {
    const entities: Entities = model.getEntities();
    if (entities[entityIdentifier] === undefined) {
      continue;
    }
    return model;
  }
  return null;
};

export const findSourceModelsOfEntities = (
  entityIdentifiers: string[],
  models: Map<string, EntityModel>,
): (EntityModel | null)[] => {
  const sourceModels = [];
  for (const entityIdentifier of entityIdentifiers) {
    const sourceModel = findSourceModelOfEntity(entityIdentifier, models);
    sourceModels.push(sourceModel);
  }
  return sourceModels;
};
