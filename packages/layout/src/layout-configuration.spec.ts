import { describe, expect, it } from "vitest";
import { layoutConfig, resolveLayoutConfig } from "./layout-configuration-model.ts";

describe("layout configuration", () => {
  it("retains nested defaults while patching options and deleting explicit undefined", () => {
    const defaults = resolveLayoutConfig([]);
    const result = resolveLayoutConfig([
      layoutConfig({ main: { elk_layered: { layer_gap: 123 } } }),
      layoutConfig({ main: { elk_layered: { advanced_settings: undefined } } }),
    ]);
    expect(result.main.elk_layered.layer_gap).toBe(123);
    expect(result.main.elk_layered.in_layer_gap).toBe(defaults.main.elk_layered.in_layer_gap);
    expect(result.main.elk_layered).not.toHaveProperty("advanced_settings");
    expect(resolveLayoutConfig([])).toEqual(defaults);
  });
});
