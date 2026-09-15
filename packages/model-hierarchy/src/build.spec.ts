import { describe, expect, it } from "vitest";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { PROJECT_MODEL_ID, PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { buildModelHierarchy } from "./build.ts";
import type { ModelCompositionConfiguration, ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "./composition-configuration.ts";

function vocabulary(id: string, modelType = LOCAL_SEMANTIC_MODEL, projectId = "root"): ProjectModelEntity {
  return { id, type: [PROJECT_MODEL_MODEL_ENTITY], modelType, projectId, label: {}, description: {} };
}

function packageEntity(id: string, subModels: string[], projectId = id): PackageEntity {
  return { ...vocabulary(id, LOCAL_PACKAGE, projectId), modelType: LOCAL_PACKAGE, subModels, reusedProjects: [] };
}

function modelRecords(entities: ProjectModelEntity[], configuration?: ModelCompositionConfiguration): Record<string, EntityRecord> {
  const project = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const models: Record<string, EntityRecord> = Object.fromEntries(entities.map((entity) => [entity.id, {}]));
  models[PROJECT_MODEL_ID] = project;
  if (configuration) {
    const root = { id: "root", type: [], modelCompositionConfiguration: configuration };
    models.root = { root };
  }
  return models;
}

describe("model composition", () => {
  it("includes legacy semantic models and keeps imported models read-only", () => {
    const models = modelRecords([
      packageEntity("root", ["cim", "pim", "rdfs", "query", "other"]),
      vocabulary("cim", V1.CIM),
      vocabulary("pim", V1.PIM),
      vocabulary("rdfs", RDFS_MODEL),
      vocabulary("query", QUERYABLE_MODEL),
      vocabulary("other", "non-semantic-model"),
    ]);

    const hierarchy = buildModelHierarchy("root", models);
    expect(Object.keys(hierarchy)).toEqual(["cim", "pim", "rdfs", "query", "root"]);
    expect(hierarchy.root).toMatchObject({ type: ["specification"], vocabularies: ["cim", "pim", "rdfs", "query"], applicationProfile: null });
    expect(hierarchy.cim).toMatchObject({ writable: true });
    expect(hierarchy.pim).toMatchObject({ writable: true });
    expect(hierarchy.rdfs).toMatchObject({ writable: false });
    expect(hierarchy.query).toMatchObject({ writable: false });
  });

  it("passes nested profile sources through to the root profile", () => {
    const models = modelRecords([
      packageEntity("root", ["nested", "root/profile", "local"]),
      vocabulary("root/profile"),
      vocabulary("local"),
      packageEntity("nested", ["nested/profile", "source"]),
      vocabulary("nested/profile", LOCAL_SEMANTIC_MODEL, "nested"),
      vocabulary("source", LOCAL_SEMANTIC_MODEL, "nested"),
    ]);

    const hierarchy = buildModelHierarchy("root", models);
    expect(hierarchy["root/profile"]).toMatchObject({
      type: ["application-profile"], profiles: ["local", "nested/profile"], passThrough: false, writable: true,
    });
    expect(hierarchy["nested/profile"]).toMatchObject({
      type: ["application-profile"], profiles: ["source"], passThrough: true, writable: false,
    });
    expect(hierarchy.source).toMatchObject({ writable: false });
    expect(buildModelHierarchy("root", models, true)["root/profile"]).toMatchObject({ passThrough: true });
    expect(hierarchy.root).toMatchObject({ vocabularies: [], applicationProfile: "root/profile" });
    expect(hierarchy.nested).toMatchObject({ type: ["specification"], vocabularies: [], applicationProfile: "nested/profile" });
  });

  it("excludes earlier references from merge-all and records vocabulary merge order", () => {
    const configuration: ModelCompositionConfigurationMerge = {
      modelType: "merge",
      models: [
        { model: "second" },
        { model: { modelType: "merge", models: null } as ModelCompositionConfigurationMerge },
        { model: "second" },
      ],
    };
    const models = modelRecords([
      packageEntity("root", ["first", "second"]), vocabulary("first"), vocabulary("second"),
    ], configuration);

    const hierarchy = buildModelHierarchy("root", models);
    expect(hierarchy.root).toMatchObject({ vocabularies: ["second", "first"], applicationProfile: null });
    expect(Object.keys(hierarchy)).toHaveLength(3);
  });

  it("forces explicit root pass-through without modifying stored configuration", () => {
    const configuration: ModelCompositionConfigurationApplicationProfile = Object.freeze({
      modelType: "application-profile", model: "profile", profiles: "source",
      canAddEntities: false, canModify: false, allowPassThrough: false,
    });
    const models = modelRecords([
      packageEntity("root", ["profile", "source"]), vocabulary("profile"), vocabulary("source"),
    ], configuration);

    expect(buildModelHierarchy("root", models, true).profile).toMatchObject({ passThrough: true });
    expect(configuration.allowPassThrough).toBe(false);
    expect(buildModelHierarchy("root", models).profile).toMatchObject({ writable: false, canAddEntities: false, canModify: false, passThrough: false });
  });

  it("exposes a vocabulary alongside its application profile", () => {
    const profile: ModelCompositionConfigurationApplicationProfile = {
      modelType: "application-profile", model: "profile", profiles: "source",
      canAddEntities: false, canModify: true,
    };
    const configuration: ModelCompositionConfigurationMerge = {
      modelType: "merge", models: [{ model: profile }, { model: "source" }],
    };
    const models = modelRecords([
      packageEntity("root", ["profile", "source"]), vocabulary("profile"), vocabulary("source"),
    ], configuration);

    const hierarchy = buildModelHierarchy("root", models);
    expect(Object.keys(hierarchy)).toHaveLength(3);
    expect(hierarchy.profile).toMatchObject({ profiles: ["source"], canAddEntities: false, canModify: true });
    expect(hierarchy.root).toMatchObject({ vocabularies: ["source"], applicationProfile: "profile" });
  });

  it("keeps references to unloaded sources without emitting unloaded entities", () => {
    const models = modelRecords([
      packageEntity("root", ["root/profile", "source"]), vocabulary("root/profile"), vocabulary("source"),
    ]);
    delete models.source;

    const hierarchy = buildModelHierarchy("root", models);
    expect(Object.keys(hierarchy)).toEqual(["root/profile", "root"]);
    expect(hierarchy["root/profile"]).toMatchObject({ profiles: ["source"] });
  });

  it("allows consumers to handle an empty composition", () => {
    const models = modelRecords([packageEntity("root", [])]);
    expect(buildModelHierarchy("root", models).root).toMatchObject({ type: ["specification"], vocabularies: [], applicationProfile: null });
  });

  it.each([false, true])("rejects merging distinct application profiles (nested: %s)", (nested) => {
    const first: ModelCompositionConfigurationApplicationProfile = {
      modelType: "application-profile", model: "first", profiles: "source", canAddEntities: true, canModify: true,
    };
    const second: ModelCompositionConfigurationApplicationProfile = {
      ...first, model: "second",
    };
    const merge: ModelCompositionConfigurationMerge = {
      modelType: "merge", models: [{ model: first }, { model: second }],
    };
    const configuration = nested ? { ...first, model: "outer", profiles: merge } : merge;
    const models = modelRecords([
      packageEntity("root", ["first", "second", "outer", "source"]),
      vocabulary("first"), vocabulary("second"), vocabulary("outer"), vocabulary("source"),
    ], configuration);

    expect(() => buildModelHierarchy("root", models)).toThrow("cannot merge multiple application profiles");
  });

  it("retains the specification of a package referenced more than once", () => {
    const configuration: ModelCompositionConfigurationMerge = {
      modelType: "merge", models: [{ model: "nested" }, { model: "nested" }],
    };
    const models = modelRecords([
      packageEntity("root", ["nested"]), packageEntity("nested", ["source"]), vocabulary("source"),
    ], configuration);

    const hierarchy = buildModelHierarchy("root", models);
    expect(hierarchy.nested).toMatchObject({ vocabularies: ["source"], applicationProfile: null });
    expect(hierarchy.root).toMatchObject({ vocabularies: ["source"], applicationProfile: null });
  });

  it("requires the virtual project model", () => {
    expect(() => buildModelHierarchy("root", {})).toThrow("Project model with ID '_project_model' is not available.");
  });
});
