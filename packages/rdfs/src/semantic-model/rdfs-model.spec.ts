import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { getSemanticModelMainEntity, type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Store } from "n3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRdfsSemanticModelAdapter } from "../adapter/adapter.ts";
import { createRdfsModel, reloadRdfsModel } from "./implementation.ts";

vi.mock("../rdfs-adapter.ts", () => ({ createRdfsSemanticModelAdapter: vi.fn() }));

const vocabulary: EntityRecord<SemanticModelClass> = { item: { id: "item", type: ["class"], iri: "https://example.com/Item", name: {}, description: {} } };

function fetchTurtle(text: string): HttpFetch {
  return vi.fn(async () => ({ status: 200, statusText: "OK", headers: new Headers(), text: async () => text, json: async () => null }));
}

beforeEach(() => {
  vi.mocked(createRdfsSemanticModelAdapter).mockReset();
  vi.mocked(createRdfsSemanticModelAdapter).mockReturnValue({ getAllSemanticEntities: () => vocabulary } as unknown as ReturnType<typeof createRdfsSemanticModelAdapter>);
});

describe("RDFS snapshot materialization", () => {
  it("combines documents with their own base URLs and returns the adapter entities with model metadata", async () => {
    const urls = ["https://example.com/a/file.ttl", "https://example.com/b/file.ttl"];
    const fetch = fetchTurtle('<Class> <https://example.com/p> "value" .');
    const entities = await createRdfsModel("model", urls, fetch, { en: "Vocabulary" });
    const store = vi.mocked(createRdfsSemanticModelAdapter).mock.calls[0]![0] as Store;
    expect(
      store
        .getSubjects(null, null, null)
        .map((subject) => subject.value)
        .sort(),
    ).toEqual(["https://example.com/a/Class", "https://example.com/b/Class"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(entities.item).toBe(vocabulary.item);
    expect(entities.model).toEqual({ id: "model", type: [LOCAL_SEMANTIC_MODEL], label: { en: "Vocabulary" }, source: { type: "snapshot", provider: "rdfs", urls } });
  });

  it("reloads using stored or replacement URLs without mutating the original metadata", async () => {
    const fetch = fetchTurtle("");
    const original = await createRdfsModel("model", ["https://example.com/old.ttl"], fetch, { cs: "Slovník" });
    original.model = Object.assign({}, original.model, { baseIri: "https://example.com/", custom: "preserved" });
    const before = structuredClone(original);
    await reloadRdfsModel(original, fetch);
    expect(fetch).toHaveBeenLastCalledWith("https://example.com/old.ttl", expect.anything());
    const next = await reloadRdfsModel(original, fetch, ["https://example.com/new.ttl"]);
    expect(getSemanticModelMainEntity(next)).toMatchObject({
      id: "model",
      label: { cs: "Slovník" },
      baseIri: "https://example.com/",
      custom: "preserved",
      source: { urls: ["https://example.com/new.ttl"] },
    });
    expect(original).toEqual(before);
  });

  it("rejects HTTP and parsing failures without changing the existing snapshot", async () => {
    const original = await createRdfsModel("model", [], fetchTurtle(""));
    const before = structuredClone(original);
    const failedFetch: HttpFetch = async () => ({ status: 503, statusText: "Unavailable", headers: new Headers(), text: async () => "", json: async () => null });
    await expect(reloadRdfsModel(original, failedFetch, ["https://example.com/file.ttl"])).rejects.toThrow("503");
    await expect(reloadRdfsModel(original, fetchTurtle("invalid turtle"), ["https://example.com/file.ttl"])).rejects.toThrow();
    expect(original).toEqual(before);
  });
});
