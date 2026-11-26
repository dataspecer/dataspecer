import { describe, expect, it } from "vitest";
import { coreResourceToEntity, type CoreResource } from "@dataspecer/core/core/core-resource";
import {
  DataPsmAssociationEnd, DataPsmAttribute, DataPsmClass, DataPsmClassReference,
  DataPsmContainer, DataPsmExternalRoot, DataPsmInclude, DataPsmOr, DataPsmSchema,
} from "@dataspecer/core/data-psm/model";
import { garbageCollectStructureModel } from "./garbage-collect-structure-model.ts";

function model(...resources: CoreResource[]) {
  return Object.fromEntries(resources.map(resource => [resource.iri!, coreResourceToEntity(resource)]));
}

describe("structure model garbage collection", () => {
  it("removes a disconnected subtree and its cycle despite stale schema parts", () => {
    const schema = Object.assign(new DataPsmSchema("schema"), {
      dataPsmRoots: ["root"], dataPsmParts: ["root", "connection", "child", "attribute", "loop", "already-deleted"],
    });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmParts: ["connection"] });
    const connection = Object.assign(new DataPsmAssociationEnd("connection"), { dataPsmPart: "child" });
    const child = Object.assign(new DataPsmClass("child"), { dataPsmParts: ["attribute", "loop"] });
    const attribute = new DataPsmAttribute("attribute");
    const loop = Object.assign(new DataPsmAssociationEnd("loop"), { dataPsmPart: "child" });
    expect(Object.keys(garbageCollectStructureModel(model(schema, root, connection, child, attribute, loop)))).toHaveLength(6);
    root.dataPsmParts = [];
    const input = model(schema, root, connection, child, attribute, loop);
    const before = structuredClone(input);
    const result = garbageCollectStructureModel(input);
    expect(Object.keys(result)).toEqual(["schema", "root"]);
    expect(result.schema).toMatchObject({ dataPsmParts: ["root"], dataPsmRoots: ["root"] });
    expect(result.root).toBe(input.root);
    expect(input).toEqual(before);
    expect(garbageCollectStructureModel(result)).toEqual(result);
  });

  it("preserves every root and collects models independently of external references", () => {
    const firstSchema = Object.assign(new DataPsmSchema("first-schema"), { dataPsmRoots: ["reference"] });
    const reference = Object.assign(new DataPsmClassReference("reference"), { dataPsmSpecification: "second", dataPsmClass: "shared" });
    const secondSchema = Object.assign(new DataPsmSchema("second-schema"), { dataPsmRoots: ["shared", "other-root"] });
    const shared = Object.assign(new DataPsmClass("shared"), { dataPsmParts: ["value"] });
    const first = garbageCollectStructureModel(model(firstSchema, reference, new DataPsmClass("shared")));
    const second = garbageCollectStructureModel(model(secondSchema, shared, new DataPsmAttribute("value"), new DataPsmClass("other-root"), new DataPsmClass("unused")));
    expect(first).not.toHaveProperty("shared");
    expect(first.reference).toMatchObject({ dataPsmSpecification: "second", dataPsmClass: "shared" });
    expect(Object.keys(second)).toEqual(["second-schema", "shared", "value", "other-root"]);
    expect(second["second-schema"]).toMatchObject({ dataPsmRoots: ["shared", "other-root"] });
  });

  it("traverses local inheritance, includes, choices, containers and profiling", () => {
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmExtends: ["base"], dataPsmParts: ["include", "association"] });
    const base = Object.assign(new DataPsmClass("base"), { dataPsmExtends: ["root"], profiling: ["source", "external-source"] });
    const include = Object.assign(new DataPsmInclude("include"), { dataPsmIncludes: "included" });
    const included = Object.assign(new DataPsmClass("included"), { dataPsmParts: ["container"] });
    const container = Object.assign(new DataPsmContainer("container"), { dataPsmParts: ["value"] });
    const association = Object.assign(new DataPsmAssociationEnd("association"), { dataPsmPart: "choice" });
    const choice = Object.assign(new DataPsmOr("choice"), { dataPsmChoices: ["external"] });
    const input = model(schema, root, base, include, included, container, association, choice, new DataPsmExternalRoot("external"), new DataPsmAttribute("value"), new DataPsmClass("source"));
    expect(garbageCollectStructureModel(input)).toEqual(input);
  });

  it("keeps metadata only with no roots and ignores semantic references", () => {
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmParts: ["unused"], profiling: ["external-schema"] });
    expect(garbageCollectStructureModel(model(schema, new DataPsmClass("unused"))))
      .toEqual(model(Object.assign(new DataPsmSchema("schema"), { profiling: ["external-schema"] })));
    const root = Object.assign(new DataPsmClass("root"), { dataPsmInterpretation: "semantic-class" });
    schema.dataPsmRoots = ["root"];
    expect(garbageCollectStructureModel(model(schema, root))).toHaveProperty("root");
    expect(garbageCollectStructureModel({})).toEqual({});
  });

  it("reports broken local references and unsupported reachable types", () => {
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["missing"] });
    expect(() => garbageCollectStructureModel(model(schema))).toThrow("missing structural entity missing");
    schema.dataPsmRoots = ["unknown"];
    expect(() => garbageCollectStructureModel({ ...model(schema), unknown: { id: "unknown", type: ["unknown"] } })).toThrow("unsupported structural entity unknown");
  });

  it("supports Entity-only PSM records", () => {
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmExtends: ["base"] });
    const records = Object.fromEntries(Object.entries(model(schema, root, new DataPsmClass("base"))).map(([id, entity]) => {
      const { iri: _iri, types: _types, ...rest } = entity;
      return [id, rest];
    }));
    expect(garbageCollectStructureModel(records)).toEqual(records);
  });
});
