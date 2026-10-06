import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { getProvidedSourceSemanticModel } from "./cim-adapter.ts";

/**
 * Reloads a semantic model that caches external source. The reload is done by
 * fetching everything and removing new entities so the only changes are updates
 * to existing entities and removals.
 *
 * It is expected to run the output of this function through diff function to
 * obtain the list of changes.
 */
export async function reloadCachedSemanticModel(oldEntities: EntityRecord): Promise<EntityRecord> {
  const mainEntity = Object.values(oldEntities).find((entity) => entity.type?.includes(LOCAL_SEMANTIC_MODEL));
  if (!mainEntity) {
    throw new Error("Cached semantic model has no main entity.");
  }

  const sourceModel = getProvidedSourceSemanticModel((mainEntity as unknown as { caches: string[] }).caches);
  const classes = Object.values(oldEntities).filter(isSemanticModelClass);
  const refreshed = [];

  // todo: make it parallel but not all at once.
  for (const entity of classes) {
    if (!entity.iri) {
      refreshed.push([]);
      continue;
    }
    refreshed.push(await sourceModel.getSurroundings(entity.iri));
  }

  // We suppose here that IDs are deterministic (ID is equal IRI, for generalizations they are generated from IRIs)
  const refreshedById: EntityRecord = Object.assign({}, ...refreshed.map((entities) => Object.fromEntries(entities.map((entity) => [entity.id, entity]))));
  const nextEntities: EntityRecord = { [mainEntity.id]: mainEntity };
  for (const id of Object.keys(oldEntities)) {
    if (id !== mainEntity.id && refreshedById[id]) {
      nextEntities[id] = refreshedById[id]!;
    }
  }
  return nextEntities;
}
