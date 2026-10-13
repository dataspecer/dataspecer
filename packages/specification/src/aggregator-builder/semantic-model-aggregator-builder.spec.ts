import { describe, expect, it, vi } from "vitest";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { SEMANTIC_MODEL_CLASS, type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { SEMANTIC_MODEL_CLASS_PROFILE, type SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ApplicationProfileHierarchyEntity, ModelHierarchyEntity, SpecificationHierarchyEntity, VocabularyHierarchyEntity } from "@dataspecer/model-hierarchy";
import { build } from "./semantic-model-aggregator-builder.ts";
import * as cimAdapter from "./cim-adapter.ts";

function vocabulary(id: string): VocabularyHierarchyEntity {
  return {
    id, type: ["vocabulary"], modelType: LOCAL_SEMANTIC_MODEL, label: {}, projectId: "project",
    specificationId: "project",
  };
}

function profile(id: string, profiles: string[], specificationId = "project"): ApplicationProfileHierarchyEntity {
  return {
    id, type: ["application-profile"], modelType: LOCAL_SEMANTIC_MODEL, label: {}, projectId: "project",
    specificationId, profiles,
  };
}

function specification(id: string, vocabularies: string[], applicationProfile: string | null = null, usedExternalSpecifications: string[] = []): SpecificationHierarchyEntity {
  return {
    id, type: ["specification"], modelType: LOCAL_PACKAGE, label: {}, projectId: "project",
    specificationId: id, vocabularies, applicationProfile, usedExternalSpecifications,
  };
}

function semanticClass(id: string): SemanticModelClass {
  return { id, type: [SEMANTIC_MODEL_CLASS], iri: `https://example.com/${id}`, name: { en: id }, description: {} };
}

function classProfile(id: string, source: string): SemanticModelClassProfile {
  return {
    id, type: [SEMANTIC_MODEL_CLASS_PROFILE], iri: `https://example.com/${id}`, profiling: [source],
    name: null, nameFromProfiled: source, description: null, descriptionFromProfiled: source,
    usageNote: null, usageNoteFromProfiled: null, externalDocumentationUrl: null, tags: [], controlledVocabularies: undefined,
  };
}

function semanticModel(id: string, entities: Entity[] = []): EntityRecord {
  return {
    [id]: { id, type: [LOCAL_SEMANTIC_MODEL] },
    ...Object.fromEntries(entities.map((entity) => [entity.id, entity])),
  };
}

describe("aggregation from hierarchy entities", () => {
  it("selects vocabulary roots from a specification, independent of record order", async () => {
    const source = semanticClass("source");
    const other = semanticClass("other");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      second: vocabulary("second"), first: vocabulary("first"),
      project: specification("project", ["first", "second"]),
      another: specification("another", ["second"]),
    };
    const aggregator = build("project", hierarchy, { first: { source }, second: { other } });

    expect(Object.keys(build("another", hierarchy, { second: { other } }).getAggregatedEntities())).toEqual(["other"]);
    expect(Object.keys(aggregator.getAggregatedEntities())).toEqual(["source", "other"]);
    expect((await aggregator.search("")).map((entity) => entity.aggregatedEntity.id)).toEqual(["source", "other"]);
  });

  it("exposes only the profile by default and includes all sources with forced pass-through", () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", ["local"], "profile", ["external"]),
      profile: profile("profile", ["local", "external"]), local: vocabulary("local"), external: vocabulary("external"),
    };
    const models = {
      profile: semanticModel("profile", [classProfile("selected", "source")]),
      local: { local: semanticClass("local") }, external: { source: semanticClass("source") },
    };
    const before = structuredClone(hierarchy);
    expect(Object.keys(build("project", hierarchy, models).getAggregatedEntities())).toEqual(["selected"]);
    expect(Object.keys(build("project", hierarchy, models, undefined, undefined, { forcePassThrough: true }).getAggregatedEntities()))
      .toEqual(["selected", "local", "source"]);
    expect(hierarchy).toEqual(before);
  });

  it("includes external dependencies of vocabulary-only specifications only with pass-through", () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", ["local"], null, ["nested", "external"]),
      nested: specification("nested", ["nested-local"], null, ["deep"]),
      local: vocabulary("local"), "nested-local": vocabulary("nested-local"), external: vocabulary("external"), deep: vocabulary("deep"),
    };
    const models = Object.fromEntries(["local", "nested-local", "external", "deep"].map(id => [id, { [id]: semanticClass(id) }]));
    expect(Object.keys(build("project", hierarchy, models).getAggregatedEntities())).toEqual(["local"]);
    expect(Object.keys(build("project", hierarchy, models, undefined, undefined, { forcePassThrough: true }).getAggregatedEntities()))
      .toEqual(["local", "nested-local", "deep", "external"]);
  });

  it("resolves profiles through nested specifications and propagates source updates", () => {
    const source = semanticClass("source");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "outer", ["nested"]),
      nested: specification("nested", ["local"], "inner", ["external"]),
      outer: profile("outer", ["nested"]), inner: profile("inner", ["local", "external"], "nested"),
      local: vocabulary("local"), external: vocabulary("external"),
    };
    const models = {
      outer: semanticModel("outer", [classProfile("selected-profile", "inner-class"), classProfile("selected-source", "source"), classProfile("selected-local", "local")]),
      inner: semanticModel("inner", [classProfile("inner-class", "source")]),
      local: { local: semanticClass("local") }, external: { source },
    };
    const listeners: ((changes: Record<string, EntityChange[]>) => void)[] = [];
    const aggregator = build("project", hierarchy, models, listener => {
      listeners.push(listener);
      return () => {};
    });
    expect(Object.keys(aggregator.getAggregatedEntities()).sort()).toEqual(["selected-local", "selected-profile", "selected-source"]);
    expect(aggregator.getLocalEntity("selected-profile")?.aggregatedEntity).toMatchObject({ name: { en: "source" } });
    expect(aggregator.getLocalEntity("selected-local")?.aggregatedEntity).toMatchObject({ name: { en: "local" } });
    expect(listeners).toHaveLength(4);
    expect(Object.keys(build("nested", hierarchy, models).getAggregatedEntities())).toEqual(["inner-class"]);
    const changed = { ...source, name: { en: "Updated" } };
    for (const listener of listeners) {
      listener({ external: [{ previous: source, next: changed }] });
    }
    expect(aggregator.getLocalEntity("selected-profile")?.aggregatedEntity).toMatchObject({ name: { en: "Updated" } });
    expect(aggregator.getLocalEntity("selected-source")?.aggregatedEntity).toMatchObject({ name: { en: "Updated" } });
  });

  it("keeps permission to modify separate from permission to add", async () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "profile", ["source"]),
      profile: profile("profile", ["source"]), source: vocabulary("source"),
    };
    const models = { profile: semanticModel("profile"), source: { source: semanticClass("source") } };
    const executeOperation = vi.fn();
    const aggregator = build("project", hierarchy, models, undefined, executeOperation, { canAddEntities: false, canModify: true });
    const operation = { id: "operation", type: "test-operation" };

    aggregator.execOperation(operation);
    expect(executeOperation).toHaveBeenCalledWith("profile", operation);
    expect(await aggregator.search("source")).toEqual([]);

    const readOnly = build("project", hierarchy, models, undefined, executeOperation, { canAddEntities: true, canModify: false });
    expect(() => readOnly.execOperation(operation)).toThrow("Modifying entities is not allowed");
    expect(await readOnly.search("source")).toEqual([]);
    expect(executeOperation).toHaveBeenCalledTimes(1);
  });

  it("creates profiles only in the selected specification when selecting a dependency profile", async () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "outer", ["nested"]),
      nested: specification("nested", ["source"], "inner"),
      outer: profile("outer", ["nested"]), inner: profile("inner", ["source"], "nested"), source: vocabulary("source"),
    };
    const models = {
      outer: semanticModel("outer"), inner: semanticModel("inner", [classProfile("inner-class", "source")]),
      source: { source: semanticClass("source") },
    };
    const executeOperation = vi.fn();
    const aggregator = build("project", hierarchy, models, undefined, executeOperation);
    const results = (await aggregator.search("")).filter(entity => entity.aggregatedEntity.id === "inner-class");
    expect(results).toHaveLength(1);
    aggregator.externalEntityToLocalForSearch(results[0]!);
    expect(executeOperation).toHaveBeenCalledTimes(1);
    expect(executeOperation).toHaveBeenCalledWith("outer", expect.objectContaining({
      entity: expect.objectContaining({ profiling: ["inner-class"] }),
    }));

    const nested = build("nested", hierarchy, models, undefined, executeOperation);
    const operation = { id: "operation", type: "test-operation" };
    nested.execOperation(operation);
    expect(executeOperation).toHaveBeenLastCalledWith("inner", operation);
  });

  it("forwards external cache writes when adding a root profile", async () => {
    const source = semanticClass("source");
    const adapter = cimAdapter.getProvidedSourceSemanticModel([]);
    vi.spyOn(adapter, "search").mockResolvedValue([source]);
    vi.spyOn(cimAdapter, "getProvidedSourceSemanticModel").mockReturnValue(adapter);
    try {
      const hierarchy: EntityRecord<ModelHierarchyEntity> = {
        project: specification("project", [], "profile", ["cache"]),
        profile: profile("profile", ["cache"]), cache: vocabulary("cache"),
      };
      const models = {
        profile: semanticModel("profile"),
        cache: { cache: { id: "cache", type: [LOCAL_SEMANTIC_MODEL], caches: [] } },
      };
      const listeners: ((changes: Record<string, EntityChange[]>) => void)[] = [];
      const executeOperation = vi.fn((modelId, operation) => {
        if (modelId === "cache") {
          for (const listener of listeners) {
            listener({ cache: [{ previous: null, next: operation.entity }] });
          }
        }
      });
      const aggregator = build("project", hierarchy, models, listener => {
        listeners.push(listener);
        return () => {};
      }, executeOperation);
      const results = await aggregator.search("source");
      expect(results).toHaveLength(1);
      aggregator.externalEntityToLocalForSearch(results[0]!);
      expect(executeOperation.mock.calls.map(([modelId]) => modelId)).toEqual(["cache", "profile"]);
      expect(executeOperation).toHaveBeenLastCalledWith("profile", expect.objectContaining({
        entity: expect.objectContaining({ profiling: ["source"] }),
      }));
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("requires a specification ID and validates the exposed model types", () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "profile"),
      profile: profile("profile", ["source"]), source: vocabulary("source"),
    };
    expect(() => build("missing", hierarchy, {})).toThrow("Specification 'missing' not found");
    expect(() => build("source", hierarchy, {})).toThrow("Specification 'source' not found");
    expect(() => build("project", { ...hierarchy, project: specification("project", ["profile"]) }, {}))
      .toThrow("Model 'profile' is not a vocabulary");
    expect(() => build("project", { ...hierarchy, project: specification("project", [], "source") }, {}))
      .toThrow("Model 'source' is not an application profile");
  });

  it("reports unresolved hierarchy references, missing data and specification cycles", () => {
    expect(() => build("project", { project: specification("project", [], "profile"), profile: profile("profile", ["missing"]) }, { profile: semanticModel("profile") }))
      .toThrow("Model 'missing' not found in the hierarchy.");
    expect(() => build("project", { project: specification("project", ["source"]), source: vocabulary("source") }, {}))
      .toThrow("Model 'source' has no loaded entities.");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "profile", ["nested"]), profile: profile("profile", ["nested"]),
      nested: specification("nested", [], null, ["project"]),
    };
    expect(() => build("project", hierarchy, { profile: semanticModel("profile") })).toThrow("Cyclic model hierarchy at 'project'.");
  });

  it("merges shared specification dependencies with one subscription per model", () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "outer", ["left", "right"]), outer: profile("outer", ["left", "right"]),
      left: specification("left", [], "first", ["shared"]), first: profile("first", ["shared"], "left"),
      right: specification("right", [], "second", ["shared"]), second: profile("second", ["shared"], "right"),
      shared: specification("shared", ["source"]), source: vocabulary("source"),
    };
    const subscribe = vi.fn(() => () => {});
    const aggregator = build("project", hierarchy, {
      outer: semanticModel("outer"), first: semanticModel("first"), second: semanticModel("second"), source: { source: semanticClass("source") },
    }, subscribe, undefined, { forcePassThrough: true });
    expect(Object.keys(aggregator.getAggregatedEntities())).toEqual(["source"]);
    expect(subscribe).toHaveBeenCalledTimes(4);
  });

  it("supports empty specifications and profiles without sources", () => {
    expect(build("project", { project: specification("project", []) }, {}).getAggregatedEntities()).toEqual({});
    expect(build("project", {
      project: specification("project", [], "profile"), profile: profile("profile", []),
    }, { profile: semanticModel("profile") }).getAggregatedEntities()).toEqual({});
  });
});
