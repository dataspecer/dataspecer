import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { createTemplateConfigurationConverter, diffTemplateConfiguration } from "./convert-template-configuration.ts";

const defaults = { type: "respec", template: "{{>abstract}}", templates: { abstract: "Default abstract", metadata: "{}" } };
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

it("diffs only changed templates, preserving explicit empty strings", () => {
  expect(diffTemplateConfiguration(defaults, {})).toBe("");
  expect(diffTemplateConfiguration(defaults, defaults)).toBe("");
  const diff = diffTemplateConfiguration(defaults, { templates: { abstract: "" } });
  expect(diff).toContain("-Default abstract");
  expect(diff).not.toContain("metadata");
});

it("persists answers and reuses identical values across converter instances without AI", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "template-conversion-test-"));
  directories.push(directory);
  const cacheFile = path.join(directory, "cache.json");
  const result = { partials: { abstract: "Custom", introduction: false } };
  const generate = vi.fn().mockResolvedValue(result);
  const convert = await createTemplateConfigurationConverter({ legacyDefaults: defaults, cacheFile, generate });
  expect(await convert({})).toEqual({ partials: {} });
  expect(generate).not.toHaveBeenCalled();
  expect(await convert({ templates: { abstract: "Custom", metadata: "Custom metadata" } })).toEqual(result);
  expect(generate).toHaveBeenCalledOnce();
  const fail = vi.fn().mockRejectedValue(new Error("Must not call AI"));
  const restart = await createTemplateConfigurationConverter({ legacyDefaults: defaults, cacheFile, generate: fail });
  expect(await restart({ templates: { metadata: "Custom metadata", abstract: "Custom" } })).toEqual(result);
  expect(fail).not.toHaveBeenCalled();
  expect(Object.keys(JSON.parse(await readFile(cacheFile, "utf8")))).toHaveLength(2);
  await expect(restart({ template: "Different" })).rejects.toThrow("Must not call AI");
});

it("does not cache invalid AI output and refuses corrupted caches", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "template-conversion-test-"));
  directories.push(directory);
  const cacheFile = path.join(directory, "cache.json");
  const convert = await createTemplateConfigurationConverter({
    legacyDefaults: defaults, cacheFile, generate: async () => ({ partials: { abstract: 12 } }),
  });
  await expect(convert({ template: "Custom" })).rejects.toThrow();
  expect(JSON.parse(await readFile(cacheFile, "utf8"))).toEqual({});
  await writeFile(cacheFile, "invalid JSON");
  await expect(createTemplateConfigurationConverter({ legacyDefaults: defaults, cacheFile })).rejects.toThrow();
});
