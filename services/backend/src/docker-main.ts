/**
 * This file is an entry point for the Docker image.
 */

import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function prepareDocker(): Promise<void> {
  printBanner();

  if (process.argv.length === 2) {
    const baseUrl = (process.env.BASE_URL || "http://localhost").replace(/\/+$/, "");
    const basePath = new URL(baseUrl).pathname.replace(/\/+$/, "");
    const staticFilesPath = "/usr/src/app/html/";
    await mkdir(staticFilesPath, { recursive: true });
    await cp("/usr/src/app/html-template", staticFilesPath, { recursive: true });
    await replaceBasePath(staticFilesPath, basePath);

    process.env.BASE_NAME = baseUrl;
    process.env.STATIC_FILES_PATH = staticFilesPath;
  }

  process.env.DOCKER = "1";
  await mkdir("/usr/src/app/database/stores", { recursive: true });
  const migration = spawnSync("bunx", ["prisma", "migrate", "deploy", "--schema", "dist/schema.prisma"], {
    stdio: "inherit",
  });
  if (migration.error) {
    throw migration.error;
  }
  if (migration.status !== 0) {
    throw new Error(`Database migration failed (${migration.signal ?? migration.status}).`);
  }
}

async function replaceBasePath(directory: string, basePath: string): Promise<void> {
  const placeholder = Buffer.from("/_BASE_PATH_DOCKER_REPLACE__");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await replaceBasePath(path, basePath);
    } else if (entry.isFile()) {
      const content = await readFile(path);
      const chunks: Buffer[] = [];
      let start = 0;
      let index: number;
      while ((index = content.indexOf(placeholder, start)) !== -1) {
        chunks.push(content.subarray(start, index), Buffer.from(basePath));
        start = index + placeholder.length;
      }
      if (start > 0) {
        chunks.push(content.subarray(start));
        await writeFile(path, Buffer.concat(chunks));
      }
    }
  }
}

function printBanner(): void {
  const commit = process.env.DATASPECER_GIT_COMMIT?.slice(0, 7);
  const ref = process.env.DATASPECER_GIT_REF;
  const date = process.env.DATASPECER_GIT_COMMIT_DATE?.slice(0, 10);
  const number = process.env.DATASPECER_GIT_COMMIT_NUMBER;
  let info = number ? `version number ${number}${commit ? ` @ ${commit}` : ""}` : commit || "";
  if (date) {
    info = info ? `${info} • ${date}` : date;
  }
  if (ref) {
    info = `${info ? `${info} ` : ""}(${ref})`;
  }

  console.log(`\x1b[1;35mDataspecer\x1b[0m${info ? ` \x1b[2m${info}\x1b[0m` : ""}`);
  if (ref === "refs/heads/stable") {
    console.log("\x1b[0;32mThis is a stable build of Dataspecer, suitable for production.\x1b[0m");
  } else if (ref) {
    console.log("\x1b[0;33mIt seems that this is not a stable build. To use stable version of Dataspecer suitable for production, use ghcr.io/dataspecer/ws image.\x1b[0m");
  }
}

await prepareDocker();
await import("./main.ts");
