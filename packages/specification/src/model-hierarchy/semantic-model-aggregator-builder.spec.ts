import { describe, expect, it, vi } from "vitest";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { SEMANTIC_MODEL_CLASS, type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { ApplicationProfileHierarchyEntity, ModelHierarchyEntity, SpecificationHierarchyEntity, VocabularyHierarchyEntity } from "@dataspecer/model-hierarchy";
import { build } from "./semantic-model-aggregator-builder.ts";

function vocabulary(id: string): VocabularyHierarchyEntity {
  return {
    id, type: ["vocabulary"], modelType: LOCAL_SEMANTIC_MODEL, label: {}, projectId: "project",
    writable: true, imports: [], passThrough: false,
  };
}

function profile(id: string, profiles: string[]): ApplicationProfileHierarchyEntity {
  return {
    id, type: ["application-profile"], modelType: LOCAL_SEMANTIC_MODEL, label: {}, projectId: "project",
    writable: true, profiles, passThrough: false, canAddEntities: true, canModify: true,
  };
}

function specification(id: string, vocabularies: string[], applicationProfile: string | null = null): SpecificationHierarchyEntity {
  return { id, type: ["specification"], modelType: LOCAL_PACKAGE, label: {}, projectId: "project", vocabularies, applicationProfile };
}

function semanticClass(id: string): SemanticModelClass {
  return { id, type: [SEMANTIC_MODEL_CLASS], iri: `https://example.com/${id}`, name: { en: id }, description: {} };
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

  it("applies nested pass-through once and reuses a shared model subscription", () => {
    const source = semanticClass("source");
    const other = semanticClass("other");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", ["source"], "outer"),
      nested: specification("nested", [], "inner"),
      outer: { ...profile("outer", ["inner", "other"]), passThrough: true },
      inner: { ...profile("inner", ["source"]), passThrough: true },
      source: vocabulary("source"),
      other: vocabulary("other"),
    };
    const listeners: ((changes: Record<string, EntityChange[]>) => void)[] = [];
    const aggregator = build("project", hierarchy, { outer: semanticModel("outer"), inner: semanticModel("inner"), source: { source }, other: { other } }, (listener) => {
      listeners.push(listener);
      return () => {};
    });

    expect(Object.keys(aggregator.getAggregatedEntities())).toEqual(["source", "other"]);
    expect(listeners).toHaveLength(4);
    const nested = build("nested", hierarchy, { inner: semanticModel("inner"), source: { source } });
    expect(Object.keys(nested.getAggregatedEntities())).toEqual(["source"]);
    const changed = { ...source, name: { en: "Updated" } };
    for (const listener of listeners) {
      listener({ source: [{ previous: source, next: changed }] });
    }
    expect(aggregator.getLocalEntity("source")?.aggregatedEntity).toMatchObject({ name: { en: "Updated" } });
  });

  it("excludes profile sources unless pass-through or an explicit root includes them", () => {
    const source = semanticClass("source");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "profile"),
      profile: profile("profile", ["source"]), source: vocabulary("source"),
    };
    const models = { profile: semanticModel("profile"), source: { source } };
    expect(build("project", hierarchy, models).getAggregatedEntities()).toEqual({});
    expect(build("project", { ...hierarchy, project: specification("project", ["source"], "profile") }, models).getLocalEntity("source")).not.toBeNull();
  });

  it("keeps permission to modify separate from permission to add", async () => {
    const source = semanticClass("source");
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "profile"),
      profile: { ...profile("profile", ["source"]), canAddEntities: false },
      source: vocabulary("source"),
    };
    const executeOperation = vi.fn();
    const aggregator = build("project", hierarchy, { profile: semanticModel("profile"), source: { source } }, undefined, executeOperation);
    const operation = { id: "operation", type: "test-operation" };

    aggregator.execOperation(operation);
    expect(executeOperation).toHaveBeenCalledWith("profile", operation);
    expect(await aggregator.search("source")).toEqual([]);

    const readOnly = build("project", {
      ...hierarchy, profile: { ...profile("profile", ["source"]), canModify: false },
    }, { profile: semanticModel("profile"), source: { source } });
    expect(() => readOnly.execOperation(operation)).toThrow("Modifying entities is not allowed");
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

  it("reports unresolved hierarchy references and cycles", () => {
    expect(() => build("project", { project: specification("project", [], "profile"), profile: profile("profile", ["missing"]) }, { profile: semanticModel("profile") }))
      .toThrow("Model 'missing' not found in the hierarchy.");
    expect(() => build("project", { project: specification("project", [], "profile"), profile: profile("profile", ["profile"]) }, { profile: semanticModel("profile") }))
      .toThrow("Cyclic model hierarchy at 'profile'.");
  });

  it("rejects multiple profile inputs in a supplied hierarchy", () => {
    const hierarchy: EntityRecord<ModelHierarchyEntity> = {
      project: specification("project", [], "outer"),
      outer: profile("outer", ["first", "second"]),
      first: profile("first", ["source"]),
      second: profile("second", ["source"]),
      source: vocabulary("source"),
    };
    expect(() => build("project", hierarchy, {})).toThrow("cannot merge multiple application profiles");
  });
});
