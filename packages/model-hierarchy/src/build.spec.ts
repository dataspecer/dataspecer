import { SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { describe, expect, it } from "vitest";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { PROJECT_MODEL_ID, PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { buildModelHierarchy, isModelHierarchyRelevantChange } from "./build.ts";

function vocabulary(id: string, modelType = LOCAL_SEMANTIC_MODEL, projectId = "root"): ProjectModelEntity {
  return { id, type: [PROJECT_MODEL_MODEL_ENTITY], modelType, projectId, label: { en: id }, description: {} };
}

function packageEntity(id: string, subModels: string[], projectId = "root"): PackageEntity {
  return { ...vocabulary(id, LOCAL_PACKAGE, projectId), modelType: LOCAL_PACKAGE, subModels, reusedProjects: [] };
}

function modelRecords(entities: ProjectModelEntity[], profiles: string[] = []): Record<string, EntityRecord> {
  const models: Record<string, EntityRecord> = Object.fromEntries(entities.map((entity) => [entity.id, {}]));
  models[PROJECT_MODEL_ID] = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  for (const id of profiles) {
    models[id] = { item: { id: "item", type: [SEMANTIC_MODEL_CLASS_PROFILE] } };
  }
  return models;
}

describe("buildModelHierarchy", () => {
  it("records local definitions and direct specification dependencies", () => {
    const models = modelRecords([
      packageEntity("root", ["local", "other-local", "profile", "rdfs", "vocabulary-package", "profile-package", "structure"]),
      vocabulary("local"), vocabulary("other-local"), vocabulary("profile"), vocabulary("rdfs", RDFS_MODEL),
      vocabulary("structure", "structure"),
      packageEntity("vocabulary-package", ["nested-local", "nested-import"]),
      vocabulary("nested-local"), vocabulary("nested-import", QUERYABLE_MODEL),
      packageEntity("profile-package", ["nested-profile", "profile-source"], "reused"),
      vocabulary("nested-profile", LOCAL_SEMANTIC_MODEL, "reused"), vocabulary("profile-source", LOCAL_SEMANTIC_MODEL, "reused"),
    ], ["profile", "nested-profile"]);
    const before = structuredClone(models);
    const hierarchy = buildModelHierarchy("root", models);
    expect(hierarchy.root).toMatchObject({ type: ["specification"], vocabularies: ["local", "other-local"], applicationProfile: "profile", usedExternalSpecifications: ["rdfs", "vocabulary-package", "profile-package"] });
    expect(hierarchy.local).toMatchObject({ specificationId: "root", label: { en: "local" } });
    expect(hierarchy.profile).toMatchObject({ profiles: ["local", "other-local", "rdfs", "vocabulary-package", "profile-package"] });
    expect(hierarchy["vocabulary-package"]).toMatchObject({ vocabularies: ["nested-local"], applicationProfile: null, usedExternalSpecifications: ["nested-import"] });
    expect(hierarchy["profile-package"]).toMatchObject({ vocabularies: ["profile-source"], applicationProfile: "nested-profile", projectId: "reused" });
    expect(hierarchy["nested-profile"]).toMatchObject({ profiles: ["profile-source"], specificationId: "profile-package", projectId: "reused" });
    expect(Object.values(hierarchy).every(entity => !("imports" in entity))).toBe(true);
    expect(hierarchy.structure).toBeUndefined();
    expect(Object.values(hierarchy).every(entity => !("passThrough" in entity))).toBe(true);
    expect(models).toEqual(before);
  });

  it("includes legacy and imported models without exporting them as local definitions", () => {
    const models = modelRecords([
      packageEntity("root", ["local", "cim", "pim", "rdfs", "query"]), vocabulary("local"),
      vocabulary("cim", V1.CIM), vocabulary("pim", V1.PIM), vocabulary("rdfs", RDFS_MODEL), vocabulary("query", QUERYABLE_MODEL),
    ]);
    const hierarchy = buildModelHierarchy("root", models);
    expect(Object.keys(hierarchy)).toHaveLength(6);
    expect(hierarchy.root).toMatchObject({ vocabularies: ["local"], applicationProfile: null });
    expect(hierarchy.root).toMatchObject({ usedExternalSpecifications: ["cim", "pim", "rdfs", "query"] });
  });

  it("preserves shared dependencies and supports cyclic packages", () => {
    const models = modelRecords([
      packageEntity("root", ["outer", "left", "right"]), vocabulary("outer"),
      packageEntity("left", ["first", "shared"]), vocabulary("first"),
      packageEntity("right", ["second", "shared"]), vocabulary("second"),
      packageEntity("shared", ["source", "root"]), vocabulary("source"),
    ], ["outer", "first", "second"]);
    const hierarchy = buildModelHierarchy("root", models);
    expect(Object.keys(hierarchy)).toHaveLength(8);
    expect(hierarchy.outer).toMatchObject({ profiles: ["left", "right"] });
    expect(hierarchy.first).toMatchObject({ profiles: ["shared"] });
    expect(hierarchy.second).toMatchObject({ profiles: ["shared"] });
    expect(hierarchy.source).toMatchObject({ specificationId: "shared" });
    expect(buildModelHierarchy("root", models)).toEqual(hierarchy);
  });

  it("keeps specification dependency cycles without expanding them", () => {
    const hierarchy = buildModelHierarchy("root", modelRecords([
      packageEntity("root", ["a", "nested"]), vocabulary("a"),
      packageEntity("nested", ["b", "root"]), vocabulary("b"),
    ]));
    expect(hierarchy.root).toMatchObject({ usedExternalSpecifications: ["nested"] });
    expect(hierarchy.nested).toMatchObject({ usedExternalSpecifications: ["root"] });
  });

  it("deduplicates repeated references and excludes unreachable packages", () => {
    const hierarchy = buildModelHierarchy("root", modelRecords([
      packageEntity("root", ["local", "local", "nested", "nested"]), vocabulary("local"),
      packageEntity("nested", ["source"]), vocabulary("source"), packageEntity("unreachable", []),
    ]));
    expect(hierarchy.root).toMatchObject({ vocabularies: ["local"] });
    expect(hierarchy.root).toMatchObject({ usedExternalSpecifications: ["nested"] });
    expect(hierarchy.unreachable).toBeUndefined();
  });

  it("creates entities for empty and unloaded models using project metadata", () => {
    const models = modelRecords([packageEntity("root", ["source"]), vocabulary("source")]);
    delete models.source;
    expect(buildModelHierarchy("root", models).source).toMatchObject({ type: ["vocabulary"] });
    expect(buildModelHierarchy("root", modelRecords([packageEntity("root", [])])).root).toMatchObject({ vocabularies: [], applicationProfile: null });
  });

  it("recognizes relationship profiles and rejects multiple profiles in a package", () => {
    const models = modelRecords([packageEntity("root", ["first", "second"]), vocabulary("first"), vocabulary("second")]);
    models.first = { item: { id: "item", type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE] } };
    expect(buildModelHierarchy("root", models).root).toMatchObject({ applicationProfile: "first" });
    models.second = models.first;
    expect(() => buildModelHierarchy("root", models)).toThrow("multiple application profiles");
  });

  it("reports missing project metadata", () => {
    expect(() => buildModelHierarchy("root", {})).toThrow("Project model with ID '_project_model' is not available.");
    expect(() => buildModelHierarchy("root", modelRecords([]))).toThrow("Root package 'root' is not available.");
    expect(() => buildModelHierarchy("root", modelRecords([packageEntity("root", ["missing"])]))).toThrow("Model 'missing'");
  });
});

describe("isModelHierarchyRelevantChange", () => {
  it("reacts to project changes and both sides of profile changes", () => {
    const profile = { id: "item", type: [SEMANTIC_MODEL_CLASS_PROFILE] };
    const ordinary = { id: "item", type: [] };
    expect(isModelHierarchyRelevantChange({ [PROJECT_MODEL_ID]: [{ previous: null, next: vocabulary("new") }] })).toBe(true);
    expect(isModelHierarchyRelevantChange({ model: [{ previous: ordinary, next: profile }] })).toBe(true);
    expect(isModelHierarchyRelevantChange({ model: [{ previous: profile, next: ordinary }] })).toBe(true);
    expect(isModelHierarchyRelevantChange({ model: [{ previous: ordinary, next: null }] })).toBe(false);
    expect(isModelHierarchyRelevantChange({ [PROJECT_MODEL_ID]: [] })).toBe(false);
  });
});
