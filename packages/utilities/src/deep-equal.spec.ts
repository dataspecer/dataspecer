import { describe, expect, test } from "vitest";

import { deepEqual } from "./deep-equal.ts";

describe("deepEqual", () => {
  test("treats undefined properties as if the key does not exist", () => {
    expect(deepEqual({ a: undefined }, {})).toBe(true);
    expect(deepEqual({}, { a: undefined })).toBe(true);
    expect(deepEqual({ a: undefined, b: 1 }, { b: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});
