import { expect, it } from "vitest";
import { diagramConfig, resolveDiagramConfig } from "./configuration.ts";

it("merges diagram maps while allowing later layers to restore boolean options", () => {
  const first = diagramConfig({ showIris: false, profileOfMode: "hidden", prefixes: { "urn:first:": "first" }, texts: { mandatory: "required" } });
  const second = diagramConfig({ showIris: true, prefixes: { "urn:second:": "second" }, texts: { optional: "optional" } });
  expect(resolveDiagramConfig([first, second])).toEqual({
    showIris: true, profileOfMode: "hidden", prefixes: { "urn:first:": "first", "urn:second:": "second" },
    texts: { mandatory: "required", optional: "optional" },
  });
});
