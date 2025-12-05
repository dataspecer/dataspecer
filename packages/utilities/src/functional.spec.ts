import { describe, test, expect } from "vitest";

import { addToMapArray, removeFromMapArray } from "./functional.ts";

describe("addToMapArray", () => {

  test("Default test.", () => {

    const buckets: Map<string, any> = new Map();
    const first = {};
    addToMapArray("x", first, buckets);
    expect(buckets.get("x").length).toBe(1);

    const second = {};
    addToMapArray("x", second, buckets);
    expect(buckets.get("x").length).toBe(2);

    expect(buckets.get("x")[0]).toBe(first);
    expect(buckets.get("x")[1]).toBe(second);
  });

});

describe("removeFromMapArray", () => {

  test("Default test.", () => {
    const buckets: Map<string, any> = new Map();
    buckets.set("x", ["a", "b"]);
    removeFromMapArray(buckets, "x", "b");
    expect(buckets.get("x").length).toBe(1);
  });

});
