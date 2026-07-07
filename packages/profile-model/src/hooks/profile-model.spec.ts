import { describe, test, expect } from "vitest";
import { deleteEntity } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import { createWritableInMemoryProfileModel } from "../index.ts";
import { reactToProfileModelOperation } from "./profile-model.ts";
import type { WritableProfileModel } from "../profile-model.ts";

const profileFactory = createDefaultSemanticModelProfileOperationFactory();

/**
 * A "parent" profile model with a class profile Person, a class profile
 * Animal, and a relationship profile Person --hasPet--> Animal.
 */
function buildParentProfileModel(): WritableProfileModel {
  const model = createWritableInMemoryProfileModel({
    identifier: "parent",
    baseIri: "http://parent.example.com/",
  });

  model.executeOperations([
    profileFactory.createClassProfile(({ id: "pp-person", profiling: ["s-person"], name: { en: "Person" } })),
    profileFactory.createClassProfile(({ id: "pp-animal", profiling: ["s-animal"], name: { en: "Animal" } })),
  ]);

  model.executeOperations([
    profileFactory.createRelationshipProfile({
      id: "pp-hasPet",
      ends: [
        ({ concept: "pp-person" }),
        ({ concept: "pp-animal", iri: "hasPet", name: { en: "has pet" } }),
      ],
    }),
  ]);

  return model;
}

describe("reactToProfileModelOperation", () => {

  describe("CreateSemanticModelClassProfile", () => {

    test("proposes creating a profile of the new class profile, without an IRI", () => {
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });
      const op = profileFactory.createClassProfile(({
        id: "pp-newClass",
        iri: "http://example.com/new",
        profiling: ["s-new"],
        name: { en: "New Class" },
      }));

      const proposals = reactToProfileModelOperation({}, op, child.getEntities());

      expect(proposals).toHaveLength(1);
      const createOp = proposals[0].operations[0] as any;
      expect(createOp.type).toBe("create-class-profile");
      expect(createOp.entity.profiling).toEqual(["pp-newClass"]);
      expect(createOp.entity.nameFromProfiled).toBe("pp-newClass");
      expect(createOp.entity.iri).toBeNull();
    });

  });

  describe("CreateSemanticModelRelationshipProfile", () => {

    test("proposes the cartesian product of relationship profiles across profiled ends", () => {
      const parent = buildParentProfileModel();
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });

      // Two profiles of pp-person (domain), three profiles of pp-animal (range).
      child.executeOperations([
        profileFactory.createClassProfile(({ id: "c-person-1", profiling: ["pp-person"] })),
        profileFactory.createClassProfile(({ id: "c-person-2", profiling: ["pp-person"] })),
        profileFactory.createClassProfile(({ id: "c-animal-1", profiling: ["pp-animal"] })),
        profileFactory.createClassProfile(({ id: "c-animal-2", profiling: ["pp-animal"] })),
        profileFactory.createClassProfile(({ id: "c-animal-3", profiling: ["pp-animal"] })),
      ]);

      const op = profileFactory.createRelationshipProfile({
        id: "pp-newHasPet",
        ends: [
          ({ concept: "pp-person" }),
          ({ concept: "pp-animal", iri: "hasPet", name: { en: "has pet" } }),
        ],
      });

      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      expect(proposals).toHaveLength(6);
      for (const proposal of proposals) {
        const createOp = proposal.operations[0] as any;
        expect(createOp.type).toBe("create-relation-profile");
        expect(createOp.entity.ends[0].iri).toBeNull();
        expect(createOp.entity.ends[1].iri).toBeNull();
      }
    });

    test("proposes nothing when one of the ends is not profiled in the child", () => {
      const parent = buildParentProfileModel();
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });
      child.executeOperations([
        profileFactory.createClassProfile(({ id: "c-person", profiling: ["pp-person"] })),
      ]);

      const op = profileFactory.createRelationshipProfile({
        id: "pp-newHasPet",
        ends: [
          ({ concept: "pp-person" }),
          ({ concept: "pp-animal", iri: "hasPet" }),
        ],
      });

      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());
      expect(proposals).toHaveLength(0);
    });

  });

  describe("ModifySemanticModelClassProfile — name change", () => {

    function childWithPersonProfile(nameFromProfiled: string | null, name: Record<string, string> | null) {
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });
      child.executeOperations([
        profileFactory.createClassProfile(({
          id: "c-person",
          profiling: ["pp-person"],
          name,
          nameFromProfiled,
        })),
      ]);
      return child;
    }

    test("when profile inherits name, proposes to freeze the old name", () => {
      const parent = buildParentProfileModel();
      const child = childWithPersonProfile("pp-person", null);

      const op = profileFactory.modifyClassProfile("pp-person", { name: { en: "Human" } });
      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      const freeze = proposals.find(p => p.label.includes("Keep old name"));
      expect(freeze).toBeDefined();
      const modOp = freeze!.operations[0] as any;
      expect(modOp.entity.name).toEqual({ en: "Person" });
      expect(modOp.entity.nameFromProfiled).toBeNull();
    });

    test("when profile has its own name, proposes adopting the new value and inheriting", () => {
      const parent = buildParentProfileModel();
      const child = childWithPersonProfile(null, { en: "My Person" });

      const op = profileFactory.modifyClassProfile("pp-person", { name: { en: "Human" } });
      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      const adopt = proposals.find(p => p.label.includes("Update name"));
      const inherit = proposals.find(p => p.label.includes("Inherit new name"));
      expect(adopt).toBeDefined();
      expect(inherit).toBeDefined();

      expect((adopt!.operations[0] as any).entity.name).toEqual({ en: "Human" });
      expect((inherit!.operations[0] as any).entity.nameFromProfiled).toBe("pp-person");
    });

    test("does not propose anything when there is no matching profile in the child", () => {
      const parent = buildParentProfileModel();
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });

      const op = profileFactory.modifyClassProfile("pp-person", { name: { en: "Human" } });
      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      expect(proposals).toHaveLength(0);
    });

    test("does not propose anything for an IRI-only change", () => {
      const parent = buildParentProfileModel();
      const child = childWithPersonProfile("pp-person", null);

      const op = profileFactory.modifyClassProfile("pp-person", { iri: "http://example.com/human" });
      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      expect(proposals).toHaveLength(0);
    });

  });

  describe("DeleteEntityOperation", () => {

    test("cascades deletion of dependent relationship profiles", () => {
      const parent = buildParentProfileModel();
      const child = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });
      child.executeOperations([
        profileFactory.createClassProfile(({ id: "c-person", profiling: ["pp-person"] })),
        profileFactory.createClassProfile(({ id: "c-animal", profiling: ["pp-animal"] })),
      ]);
      child.executeOperations([
        profileFactory.createRelationshipProfile({
          id: "c-hasPet",
          ends: [
            ({ concept: "c-person" }),
            ({ concept: "c-animal", iri: "hasPet", profiling: ["pp-hasPet"] }),
          ],
        }),
      ]);

      const op = deleteEntity("pp-person");
      const proposals = reactToProfileModelOperation(parent.getEntities(), op, child.getEntities());

      expect(proposals).toHaveLength(1);
      expect(proposals[0].operations).toHaveLength(2);
      expect(proposals[0].label).toContain("1 relationship(s), 0 generalization(s)");
    });

  });

});
