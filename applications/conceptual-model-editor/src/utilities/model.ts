import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

/**
 * Return first InMemorySemanticModel or null.
 */
export function firstInMemorySemanticModel(models: Map<string, EntityModel>): InMemorySemanticModel | null {
  for (const model of models.values()) {
    if (isInMemorySemanticModel(model)) {
      return model;
    }
  }
  return null;
}
