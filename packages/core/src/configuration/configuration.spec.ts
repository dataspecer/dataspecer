import { describe, expect, it } from "vitest";
import { mergeConfigurationPatch, mergeShallowConfigurationHelper, type ConfigurationChain } from "./index.ts";
import { resolveConfigurationHelper } from "./utils.ts";

describe("configuration resolution", () => {
  it("interprets input-only directives and null while reading multiple scope keys", () => {
    interface Input { value?: number; reset?: boolean; }
    interface Result { value: number; }
    const resolve = (chain: ConfigurationChain) => resolveConfigurationHelper<Input | null, Result>(
      chain,
      layer => layer.alias !== undefined ? layer.alias : layer.example,
      () => ({ value: 1 }),
      (current, input) => ({ value: input === null || input.reset ? 1 : input.value ?? current.value }),
    );

    expect(resolve([])).toEqual({ value: 1 });
    expect(resolve([{ example: { value: 2 } }, { alias: { value: 3 } }])).toEqual({ value: 3 });
    expect(resolve([{ example: { value: 2 } }, { example: null }])).toEqual({ value: 1 });
    expect(resolve([{ example: { value: 2 } }, { alias: { reset: true } }])).toEqual({ value: 1 });
    expect(resolve([{ unrelated: { value: 100 } }])).toEqual({ value: 1 });
  });

  it("retains function identity without invoking it or changing inputs", () => {
    const callback = () => { throw new Error("Must not execute during resolution"); };
    const input = Object.freeze({ callback });
    const layer = Object.freeze({ example: input, unknown: Object.freeze({ preserve: true }) });
    const result = resolveConfigurationHelper([layer], value => value.example, () => ({}), mergeShallowConfigurationHelper);
    expect(result).toEqual({ callback });
    expect(result).not.toBe(input);
    expect(layer.unknown).toEqual({ preserve: true });
  });

  it("makes the shallow undefined policy explicit", () => {
    const defaults = Object.freeze({ value: 1, optional: "present" as string | undefined });
    expect(mergeShallowConfigurationHelper(defaults, { optional: undefined })).toEqual({ value: 1, optional: undefined });
    expect(mergeShallowConfigurationHelper(defaults, { optional: undefined }, "skip")).toEqual(defaults);
    expect(defaults.optional).toBe("present");
  });

  it("preserves legacy nested patch, deletion, and array replacement behavior", () => {
    const callback = () => 1;
    const target = Object.freeze({ nested: Object.freeze({ keep: true, remove: 1 }), items: [1, 2], callback });
    const patch = Object.freeze({ nested: Object.freeze({ remove: undefined, add: false }), items: [3] });
    expect(mergeConfigurationPatch(target, patch)).toEqual({ nested: { keep: true, add: false }, items: [3], callback });
    expect(target.nested.remove).toBe(1);
  });
});
