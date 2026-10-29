import { describe, expect, it, vi } from "vitest";
import type { SemanticModelClass, SemanticModelGeneralization } from "../concepts/concepts.ts";
import type { CimAdapter } from "./cim-adapter.ts";
import { CimAdapterWrapper } from "./cim-adapter-wrapper.ts";

const cls: SemanticModelClass = {
  id: "class-id",
  iri: "https://example.com/Class",
  type: ["class"],
  name: {},
  description: {},
};
const generalization: SemanticModelGeneralization = {
  id: "generalization-id",
  iri: null,
  type: ["generalization"],
  child: cls.id,
  parent: "parent-id",
};

describe("CimAdapterWrapper", () => {
  it.each([
    ["class:", "getClass"],
    ["surroundings:", "getSurroundings"],
    ["hierarchy:", "getFullHierarchy"],
  ] as const)("indexes entities returned by %s queries without transforming them", async (prefix, method) => {
    const adapter: CimAdapter = {
      search: vi.fn(),
      getClass: vi.fn(),
      getSurroundings: vi.fn(),
      getFullHierarchy: vi.fn(),
      getResourceGroup: vi.fn(),
      [method]: vi.fn(async () => [cls, generalization]),
    };
    const result = await new CimAdapterWrapper(adapter).query(prefix + cls.id);
    expect(result).toEqual({ [cls.id]: cls, [generalization.id]: generalization });
    expect(result[cls.id]).toBe(cls);
    expect(adapter[method]).toHaveBeenCalledExactlyOnceWith(cls.id);
  });

  it("uses entity IDs for ordered search results", async () => {
    const other = { ...cls, id: "other-id" };
    const adapter: CimAdapter = {
      search: vi.fn(async () => [other, cls]),
      getClass: vi.fn(),
      getSurroundings: vi.fn(),
      getFullHierarchy: vi.fn(),
      getResourceGroup: vi.fn(),
    };
    expect(await new CimAdapterWrapper(adapter).query("search:example")).toEqual({
      [other.id]: other,
      [cls.id]: cls,
      "search:example": { id: "search:example", type: ["search-results"], order: [other.id, cls.id] },
    });
    expect(adapter.search).toHaveBeenCalledExactlyOnceWith("example");
  });

  it("rejects unsupported queries", async () => {
    const adapter: CimAdapter = {
      search: vi.fn(),
      getClass: vi.fn(),
      getSurroundings: vi.fn(),
      getFullHierarchy: vi.fn(),
      getResourceGroup: vi.fn(),
    };
    await expect(new CimAdapterWrapper(adapter).query("unknown:example")).rejects.toThrow("is not supported");
  });
});
