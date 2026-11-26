import { describe, expect, it } from "vitest";
import { coreResourceToEntity, type CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmAssociationEnd, DataPsmAttribute, DataPsmClass, DataPsmClassReference, DataPsmExternalRoot, DataPsmInclude, DataPsmOr, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";
import { garbageCollectProfileModel } from "./garbage-collect-profile-model.ts";

function structure(...resources: CoreResource[]) {
  return Object.fromEntries(resources.map(resource => [resource.iri!, coreResourceToEntity(resource)]));
}

describe("profile garbage collection", () => {
  it("retains the complete dependency closure without retaining unrelated class properties", () => {
    const builder = createDefaultProfileModelBuilder({ baseIdentifier: "", baseIri: null });
    const parent = builder.class({ id: "parent" });
    const source = builder.class({ id: "source" });
    const named = builder.class({ id: "named" });
    const assignment = builder.controlledVocabularyAssignment({ id: "assignment", classProfile: "domain", vocabulary: "vocabulary", replaces: { kind: "local", target: "replaced" } });
    builder.controlledVocabularyAssignment({ id: "replaced", classProfile: "source", vocabulary: "vocabulary" });
    const domain = builder.class({ id: "domain", controlledVocabularies: [assignment.identifier] }).profile(source).reuseName(named);
    const range = builder.class({ id: "range" });
    builder.generalization(parent, domain);
    const relation = builder.property({ id: "relation" }).domain(domain).range(range);
    builder.property({ id: "unused-property" }).domain(domain).range(range);
    const unused = builder.class({ id: "unused-class" });
    builder.generalization(domain, unused);
    const model = builder.build().getEntities();
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmParts: ["property"] });
    const property = Object.assign(new DataPsmAttribute("property"), { dataPsmInterpretation: relation.identifier });
    const orphan = Object.assign(new DataPsmClass("orphan"), { dataPsmInterpretation: unused.identifier });
    const structures = { schema: structure(schema, root, property, orphan) };
    const before = structuredClone({ model, structures });
    const result = garbageCollectProfileModel(model, structures);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(["domain", "range", "relation", "parent", "source", "named", "assignment", "replaced"]));
    expect(result["unused-property"]).toBeUndefined();
    expect(result["unused-class"]).toBeUndefined();
    expect(Object.values(result).filter(entity => entity.type.includes("generalization"))).toHaveLength(1);
    expect(result.relation).toBe(model.relation);
    expect({ model, structures }).toEqual(before);
    expect(garbageCollectProfileModel(result, structures)).toEqual(result);
  });

  it("collects each supplied structure independently and uses all their roots", () => {
    const builder = createDefaultProfileModelBuilder({ baseIdentifier: "", baseIri: null });
    for (const id of ["inherited", "included", "referenced", "external", "other-root", "orphan"]) builder.class({ id });
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmExtends: ["base"], dataPsmParts: ["include", "association"] });
    const base = Object.assign(new DataPsmClass("base"), { dataPsmInterpretation: "inherited", dataPsmExtends: ["root"] });
    const include = Object.assign(new DataPsmInclude("include"), { dataPsmIncludes: "includedClass" });
    const included = Object.assign(new DataPsmClass("includedClass"), { dataPsmInterpretation: "included" });
    const association = Object.assign(new DataPsmAssociationEnd("association"), { dataPsmPart: "choice" });
    const choice = Object.assign(new DataPsmOr("choice"), { dataPsmChoices: ["reference", "externalRoot"] });
    const reference = Object.assign(new DataPsmClassReference("reference"), { dataPsmClass: "otherClass", dataPsmSpecification: "otherSchema" });
    const external = Object.assign(new DataPsmExternalRoot("externalRoot"), { dataPsmTypes: ["external"] });
    const otherSchema = Object.assign(new DataPsmSchema("otherSchema"), { dataPsmRoots: ["otherClass", "independentRoot"] });
    const otherClass = Object.assign(new DataPsmClass("otherClass"), { dataPsmInterpretation: "referenced" });
    const independentRoot = Object.assign(new DataPsmClass("independentRoot"), { dataPsmInterpretation: "other-root" });
    const orphanClass = Object.assign(new DataPsmClass("orphanClass"), { dataPsmInterpretation: "orphan" });
    const ownStructures = { schema: structure(schema, root, base, include, included, association, choice, reference, external) };
    const profile = builder.build().getEntities();
    expect(Object.keys(garbageCollectProfileModel(profile, ownStructures)).sort()).toEqual(["external", "included", "inherited"]);
    const result = garbageCollectProfileModel(profile, {
      ...ownStructures, otherSchema: structure(otherSchema, otherClass, independentRoot, orphanClass),
    });
    expect(Object.keys(result).sort()).toEqual(["external", "included", "inherited", "other-root", "referenced"]);
  });

  it("terminates dependency cycles within the profile model", () => {
    const builder = createDefaultProfileModelBuilder({ baseIdentifier: "", baseIri: null });
    const first = builder.class({ id: "first" });
    const second = builder.class({ id: "second" }).profile(first);
    first.profile(second);
    const entities = builder.build().getEntities();
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmInterpretation: "second" });
    expect(garbageCollectProfileModel(entities, { schema: structure(schema, root) })).toEqual(entities);
  });

  it("preserves external profile references without loading their models", () => {
    const builder = createDefaultProfileModelBuilder({ baseIdentifier: "", baseIri: null });
    builder.class({ id: "used" }).profile({ identifier: "external" });
    builder.class({ id: "unused" });
    const model = builder.build().getEntities();
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["root"] });
    const root = Object.assign(new DataPsmClass("root"), { dataPsmInterpretation: "used" });
    const result = garbageCollectProfileModel(model, { schema: structure(schema, root) });
    expect(result).toEqual({ used: model.used });
    expect(result.used).toMatchObject({ profiling: ["external"] });
  });

  it("preserves only model metadata with no roots, and reports broken structural references", () => {
    const builder = createDefaultProfileModelBuilder({ baseIdentifier: "", baseIri: null });
    builder.class({ id: "unused" });
    const metadata = { id: "model", type: [LOCAL_SEMANTIC_MODEL] };
    const model = { ...builder.build().getEntities(), model: metadata };
    expect(garbageCollectProfileModel(model, {})).toEqual({ model: metadata });
    const schema = Object.assign(new DataPsmSchema("schema"), { dataPsmRoots: ["missing"] });
    expect(() => garbageCollectProfileModel(model, { schema: structure(schema) })).toThrow("missing structural entity missing");
  });
});
