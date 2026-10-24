import type { DatabaseSync } from "node:sqlite";

// The retained history starts at 1, so there is no schema to initialize yet.
export function up(_context: { nodeDatabaseSync: DatabaseSync }): void {}
