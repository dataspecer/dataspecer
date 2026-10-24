import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { deepEqual } from "@dataspecer/utilities";
import type { MigrationContext } from "../migration-utils/migration-runner.ts";

/**
 * Moves semantic model names from the serialized `modelAlias` property to the
 * main semantic model entity's `label`. `Resource.userMetadata.label` is a
 * cache of that entity label, so it is refreshed at the same time. Keeping the
 * entity as the source of truth lets consumers read the model itself, while
 * consumers that need only basic resource information can use the cache.
 *
 * Existing models can have both `modelAlias` and a conflicting label because
 * the old metadata interface maintained a second name. For this migration,
 * `modelAlias` wins: it is copied to the Czech (`cs`) translation, then
 * removed. If no string alias exists, an existing entity label is preserved;
 * a model without either value receives an empty label. Other serialized
 * properties and metadata fields are retained.
 *
 * The SQLite resource rows and serialized model documents live in separate
 * stores. `migrateDatabase` supplies the same StoreModel used by the backend
 * so this migration can update both without dispatching model operations or
 * creating event-history transactions. Store writes are outside SQLite's
 * transaction, so the transformation is deliberately idempotent: if the
 * migration is retried after a partial run, already-migrated documents remain
 * valid and the remaining metadata caches can be brought into sync.
 *
 * ZIP imports use the corresponding import-migration stage before resources
 * are written; this database migration handles models already persisted in a
 * backend store.
 */
export async function up({ nodeDatabaseSync, storeModel }: MigrationContext): Promise<void> {
  const resources = nodeDatabaseSync.prepare(`
    SELECT id, dataStoreId, userMetadata
    FROM Resource
    WHERE representationType = ?
  `).all(LOCAL_SEMANTIC_MODEL);
  if (resources.length === 0) {
    return;
  }
  if (storeModel === undefined) {
    throw new Error("The semantic model label migration requires a store model.");
  }

  const updateMetadata = nodeDatabaseSync.prepare("UPDATE Resource SET userMetadata = ? WHERE id = ?");

  for (const resource of resources) {
    const dataStores = JSON.parse(String(resource.dataStoreId)) as Record<string, string>;
    const storeId = dataStores.model;
    if (storeId === undefined) {
      continue;
    }

    const stored = await storeModel.get(storeId);
    if (stored === null) {
      continue;
    }

    const serialized = JSON.parse(stored.toString("utf8")) as Record<string, unknown>;
    const hadAlias = Object.hasOwn(serialized, "modelAlias");
    const label = typeof serialized.modelAlias === "string"
      ? { cs: serialized.modelAlias }
      : serialized.label ?? {};
    if (hadAlias || !Object.hasOwn(serialized, "label") || !deepEqual(serialized.label, label)) {
      delete serialized.modelAlias;
      serialized.label = label;
      await storeModel.set(storeId, JSON.stringify(serialized));
    }

    const userMetadata = JSON.parse(String(resource.userMetadata)) as Record<string, unknown>;
    if (!deepEqual(userMetadata.label ?? {}, label)) {
      updateMetadata.run(JSON.stringify({ ...userMetadata, label }), resource.id);
    }
  }
}
