import { describe, expect, it, vi } from "vitest";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { BaseResource } from "@dataspecer/core/project-model/legacy";
import { QUERYABLE_MODEL } from "../../model/known-models.ts";
import { wrapCimAdapter } from "../../semantic-model/simplified/wrap-cim-adapter.ts";
import { BackendPackageService } from "./implementation.ts";

const descriptor = { type: QUERYABLE_MODEL, id: "model-id", queries: ["class:class-id"] };
const resource: BaseResource = { iri: descriptor.id, types: [QUERYABLE_MODEL], metadata: {}, userMetadata: {} };

describe("legacy queryable model loading", () => {
  it.each(["resources", "descriptors"] as const)("uses the supplied factory for %s", async source => {
    const getClass = vi.fn(async () => [{ id: "class-id", iri: "https://example.com/Class", type: ["class"] }]);
    const factory = vi.fn((_endpoint: string, _httpFetch: HttpFetch, id?: string) => wrapCimAdapter({
      getClass, search: vi.fn(), getSurroundings: vi.fn(), getFullHierarchy: vi.fn(), getResourceGroup: vi.fn(),
    }, id));
    const fetch: HttpFetch = vi.fn(async () => new Response(JSON.stringify(descriptor)));
    const service = new BackendPackageService("https://example.com/backend", fetch, factory);
    const [models] = source === "resources"
      ? await service.getModelsFromResources([resource])
      : await service.getModelsFromModelDescriptors([descriptor]);
    expect(factory.mock.calls).toEqual([source === "resources"
      ? ["https://slovník.gov.cz/sparql", fetch, descriptor.id]
      : ["https://slovník.gov.cz/sparql", fetch]]);
    expect(models[0]!.getId()).toBe(descriptor.id);
    expect(models[0]!.getEntities()["class-id"]).toMatchObject({ type: ["class"] });
    expect(getClass).toHaveBeenCalledExactlyOnceWith("class-id");
  });

  it("requires the factory only when loading a queryable model", async () => {
    const service = new BackendPackageService("https://example.com/backend", vi.fn());
    expect(await service.getModelsFromResources([])).toEqual([[], []]);
    await expect(service.getModelsFromResources([resource])).rejects.toThrow("factory is required");
    await expect(service.getModelsFromModelDescriptors([descriptor])).rejects.toThrow("factory is required");
  });
});
