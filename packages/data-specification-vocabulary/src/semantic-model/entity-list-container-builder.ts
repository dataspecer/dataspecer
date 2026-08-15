import { Entities } from "@dataspecer/core-v2";

import { EntityListContainer } from "./entity-model.ts";

interface HasEntities {

  getBaseIri(): string | null;

  getEntities(): Entities;

}

/**
 * Converts a built SemanticModel/ProfileModel (from
 * createDefaultSemanticModelBuilder / createDefaultProfileModelBuilder) into
 * the EntityListContainer shape consumed by the DSV conversion functions
 * under test. Mirrors the inline conversion in dsv-api-v2.ts.
 */
export function toEntityListContainer(model: HasEntities): EntityListContainer {
  return {
    baseIri: model.getBaseIri(),
    entities: Object.values(model.getEntities()),
  };
}

/**
 * Merges multiple EntityListContainers into one, concatenating their entity
 * lists under the first container's baseIri. For tests that need distinct
 * base IRIs kept separate, pass the containers to createContext([...])
 * instead of merging them.
 */
export function mergeEntityListContainers(
  ...containers: EntityListContainer[]
): EntityListContainer {
  return {
    baseIri: containers[0]?.baseIri ?? null,
    entities: containers.flatMap(container => container.entities),
  };
}
