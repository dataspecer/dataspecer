import type { InMemoryBackupDirectory } from "../export-import/import-backup.ts";
import { validateMigrationSequence, type Migration } from "./migration-runner.ts";

export const BACKUP_MIGRATIONS_FILE = ".migrations.json";
// We actually want to use the largest number that is still less than the first
// migration number so we can safely squash all db migrations without losing the
// ability to migrate old backups.
const UNVERSIONED_BACKUP_VERSION = 11;

export class BackupVersionTooNewError extends Error {
  readonly code = "BACKUP_VERSION_TOO_NEW";

  constructor(current: number, latest: number) {
    super(`Backup migration ${current} is newer than supported migration ${latest}. Use a newer version of the tool.`);
    this.name = "BackupVersionTooNewError";
  }
}

/** Applies pending backup hooks in place before any resources are imported. */
export async function migrateInMemoryBackup(backup: InMemoryBackupDirectory, migrations: readonly Migration[]): Promise<void> {
  const ordered = [...migrations].sort((a, b) => a.number - b.number);
  validateMigrationSequence(ordered);
  const manifest = backup.files.get(BACKUP_MIGRATIONS_FILE);
  let current = UNVERSIONED_BACKUP_VERSION;
  if (backup.files.has(BACKUP_MIGRATIONS_FILE)) {
    const version = manifest !== null && typeof manifest === "object" && !Array.isArray(manifest)
      ? (manifest as Record<string, unknown>).version : undefined;
    if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) {
      throw new Error("Invalid backup migration version.");
    }
    current = version;
  }
  const latest = ordered[ordered.length - 1].number;
  if (current > latest) {
    throw new BackupVersionTooNewError(current, latest);
  }
  if (current < ordered[1].number - 1) {
    throw new Error(`Backup migration ${current} is too old; migration ${current + 1} is no longer available. Use an older version of the tool to migrate it first.`);
  }
  for (const migration of ordered.filter(migration => migration.number > current)) {
    try {
      await migration.upBackupFile?.(backup);
      backup.files.set(BACKUP_MIGRATIONS_FILE, { version: migration.number });
    } catch (cause) {
      throw new Error(`Backup migration ${migration.number}_${migration.name} failed.`, { cause });
    }
  }
  backup.files.set(BACKUP_MIGRATIONS_FILE, { version: latest });
}
