import { describe, expect, test } from "vitest";

import { deepEqual } from "./deep-equal.ts";

describe("deepEqual", () => {
  test("distinguishes arrays from objects in JSON examples", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
    expect(deepEqual([{ value: [] }], [{ value: {} }])).toBe(false);
    expect(deepEqual(["example"], { 0: "example" })).toBe(false);
  });

  test("compares nested JSON examples independent of object key order", () => {
    expect(deepEqual(
      [{ name: "example", values: [1, null, { enabled: true }] }],
      [{ values: [1, null, { enabled: true }], name: "example" }],
    )).toBe(true);
    expect(deepEqual([{ values: [1, 2] }], [{ values: [2, 1] }])).toBe(false);
  });

  test("compares cardinalities including unbounded and inherited values", () => {
    expect(deepEqual({ cardinalityMin: 0, cardinalityMax: null }, { cardinalityMin: 0, cardinalityMax: null })).toBe(true);
    expect(deepEqual({ cardinalityMin: 0, cardinalityMax: null }, { cardinalityMin: 1, cardinalityMax: null })).toBe(false);
    expect(deepEqual({ cardinalityMin: 0, cardinalityMax: null }, { cardinalityMin: 0, cardinalityMax: 1 })).toBe(false);
    expect(deepEqual(null, { cardinalityMin: 0, cardinalityMax: null })).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });

  test("treats undefined properties as if the key does not exist", () => {
    expect(deepEqual({ a: undefined }, {})).toBe(true);
    expect(deepEqual({}, { a: undefined })).toBe(true);
    expect(deepEqual({ a: undefined, b: 1 }, { b: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});
