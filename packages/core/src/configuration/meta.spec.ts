import { describe, expect, it } from "vitest";
import { configurationImports, expandConfigurationImports } from "./meta.ts";

describe("configuration imports", () => {
  it("expands nested imports in order, reapplies shared presets, and preserves local overrides", () => {
    const registry = {
      base: { example: { value: 1 } },
      first: { ...configurationImports(["base"]), example: { value: 2 } },
      second: { ...configurationImports(["base"]), example: { other: true } },
    };
    const local = { ...configurationImports(["first", "second"]), example: { value: 3 } };
    const before = structuredClone({ registry, local });
    const chain = expandConfigurationImports([local], registry);
    expect(chain).toEqual([
      registry.base, { example: { value: 2 } }, registry.base,
      { example: { other: true } }, { example: { value: 3 } },
    ]);
    expect(expandConfigurationImports(chain, registry)).toEqual(chain);
    expect({ registry, local }).toEqual(before);
  });

  it("reports unknown presets, cycles and malformed imports", () => {
    expect(() => expandConfigurationImports([configurationImports(["missing"])], {})).toThrow("Unknown configuration preset: missing");
    expect(() => expandConfigurationImports([configurationImports(["a"])], {
      a: configurationImports(["b"]), b: configurationImports(["a"]),
    })).toThrow("a -> b -> a");
    // @ts-expect-error Exercise malformed persisted input despite the authored layer type.
    expect(() => expandConfigurationImports([{ meta: { imports: "a" } }], {})).toThrow("array");
  });
});
