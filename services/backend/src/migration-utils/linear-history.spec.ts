/**
 * This test checks whether files in migrations directory are consistent,
 * meaning they have consecutive numbers without any collisions.
 */

import { readdir } from "node:fs/promises";
import { it } from "vitest";
import { parseMigrationFiles } from "./migration-runner.ts";

const directory = new URL("../migrations/", import.meta.url);

it("migrations have linear history", async () => {
  const files = await readdir(directory);
  parseMigrationFiles(files, true);
});
