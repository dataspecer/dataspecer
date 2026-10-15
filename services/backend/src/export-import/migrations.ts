import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { InMemoryBackupDirectory } from "./import-backup.ts";

/**
 * Applies all migrations to the given in-memory backup in place.
 */
export function migrateInMemoryBackup(backup: InMemoryBackupDirectory): void {
  migrateSemanticModelLabel(backup);
}

function migrateSemanticModelLabel(directory: InMemoryBackupDirectory): void {
  const metadata = directory.files.get(".meta.json");
  const model = directory.files.get(".model.json");
  if (metadata !== undefined) {
    migrateModelLabel(metadata as object, model as object);
  }

  for (const [fileName, resourceMetadata] of directory.files) {
    const metadataMatch = /^([-0-9a-zA-Z]+)\.meta\.json$/.exec(fileName);
    if (metadataMatch === null) {
      continue;
    }
    const resourceModel = directory.files.get(`${metadataMatch[1]}.model.json`);
    migrateModelLabel(resourceMetadata as object, resourceModel as object);
  }

  for (const child of directory.directories.values()) {
    migrateSemanticModelLabel(child);
  }
}

export function migrateModelLabel(metadata: any, model: any | undefined): void {
  if (model === undefined) {
    return;
  }
  const types = metadata.types;
  if (!Array.isArray(types) || !types.includes(LOCAL_SEMANTIC_MODEL)) {
    return;
  }

  let label = model.label;
  if (typeof model.modelAlias === "string") {
    label = { cs: model.modelAlias };
    model.label = label;
  }
  delete model.modelAlias;

  if (!label) {
    const userMetadata = metadata.userMetadata ?? {};
    userMetadata.label = label;
    metadata.userMetadata = userMetadata;
  }
}
