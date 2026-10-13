import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseMigrationFiles } from "./src/migration-utils/migration-runner.ts";

const migrationDirectory = new URL("src/migrations/", import.meta.url);
const files = (await readdir(migrationDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile()).map(entry => entry.name);
const migrations = parseMigrationFiles(files);
const imports = migrations.map(({ file }, index) =>
  `import { up as up${index} } from ${JSON.stringify(fileURLToPath(new URL(file, migrationDirectory)))};`);
const entries = migrations.map(({ number, name }, index) =>
  `  { number: ${number}, name: ${JSON.stringify(name)}, up: up${index} },`);

const result = await Bun.build({
  entrypoints: [fileURLToPath(new URL("src/docker-main.ts", import.meta.url))],
  outdir: fileURLToPath(new URL("dist/", import.meta.url)),
  target: "bun",
  format: "esm",
  splitting: false,
  naming: "[name].[ext]",
  sourcemap: "linked",
  external: ["./main.config.js"],
  files: {
    [fileURLToPath(new URL("src/migration-utils/load-migrations.ts", import.meta.url))]: `${imports.join("\n")}
export async function loadMigrations() {
  return [
${entries.join("\n")}
  ];
}
`,
  },
});

for (const log of result.logs) {
  console.error(log);
}
if (!result.success) {
  throw new Error("Backend build failed.");
}
