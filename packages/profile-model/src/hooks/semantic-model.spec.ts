import { describe, test, expect } from "vitest";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import {
  createClass,
  modifyClass,
  createRelationship,
  modifyRelationEnd,
  createGeneralization,
  deleteEntity,
} from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import { createWritableInMemoryProfileModel } from "../index.ts";
import {
  type CreateClassProfileItem,
  type CreateRelationshipProfileItem,
  type DeleteProfileItem,
  type ModifyProfileItem,
} from "./evolution-items.ts";
import { analyzeEvolution } from "./semantic-model.ts";
import type { WritableProfileModel } from "../profile-model.ts";

const profileFactory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Build a semantic model with: Person --hasPet--> Animal
 * Person is a specialization of LivingThing.
 */
function buildSemanticModel() {
  const builder = createDefaultSemanticModelBuilder({
    baseIdentifier: "s-",
    baseIri: "http://example.com/",
  });
  const livingThing = builder.class({ id: "s-livingThing", name: { en: "Living Thing" } });
  const person = builder.class({ id: "s-person", name: { en: "Person" }, description: { en: "A human." } });
  const animal = builder.class({ id: "s-animal", name: { en: "Animal" } });
  person.specializationOf({ id: "s-gen1", parent: livingThing });
  const hasPet = builder.property({ id: "s-hasPet", iri: "hasPet", name: { en: "has pet" } })
    .domain(person)
    .range(animal);

  return {
    model: builder.build(),
    ids: {
      livingThing: livingThing.identifier,
      person: person.identifier,
      animal: animal.identifier,
      hasPet: hasPet.identifier,
      gen1: "s-gen1",
    },
  };
}

/**
 * Build a profile model profiling Person, Animal and LivingThing, with a
 * relationship profile for hasPet and a generalization p-person → p-livingThing.
 * All names/descriptions are inherited.
 */
function buildProfileModel(ids: ReturnType<typeof buildSemanticModel>["ids"]): WritableProfileModel {
  const profileModel = createWritableInMemoryProfileModel({
    identifier: "profile",
    baseIri: "http://profile.example.com/",
  });

  for (const [profileId, profiledId] of [
    ["p-person", ids.person],
    ["p-animal", ids.animal],
    ["p-livingThing", ids.livingThing],
  ] as const) {
    profileModel.executeOperations([
      profileFactory.createClassProfile({
        id: profileId,
        iri: profileId,
        profiling: [profiledId],
        name: null,
        nameFromProfiled: profiledId,
        description: null,
        descriptionFromProfiled: profiledId,
        usageNote: null,
        usageNoteFromProfiled: null,
        externalDocumentationUrl: null,
        tags: [],
      }),
    ]);
  }

  profileModel.executeOperations([
    profileFactory.createRelationshipProfile({
      id: "p-hasPet",
      ends: [
        {
          iri: null,
          concept: "p-person",
          cardinality: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          profiling: [],
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          iri: "hasPet",
          concept: "p-animal",
          cardinality: null,
          name: null,
          nameFromProfiled: ids.hasPet,
          description: null,
          descriptionFromProfiled: ids.hasPet,
          usageNote: null,
          usageNoteFromProfiled: null,
          profiling: [ids.hasPet],
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    }),
  ]);

  profileModel.executeOperations([
    createGeneralization({ iri: null, child: "p-person", parent: "p-livingThing" }),
  ]);

  return profileModel;
}

describe("analyzeEvolution", () => {

  describe("created entities", () => {

    test("new class produces a create-class-profile item with a provisional id", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [createClass({ id: "s-newClass", name: { en: "New Class" } })],
        profileModel.getEntities(),
      );

      expect(analysis.items).toHaveLength(1);
      const item = analysis.items[0] as CreateClassProfileItem;
      expect(item.kind).toBe("create-class-profile");
      expect(item.newProfileId).toBeTruthy();
      expect(item.dependsOn).toEqual([]);
      expect((item.operations[0] as any).entity.profiling).toContain("s-newClass");
      expect((item.operations[0] as any).entity.nameFromProfiled).toBe("s-newClass");
      // The after state of the source carries the new entity for display.
      expect((item.source.after as any).name).toEqual({ en: "New Class" });
    });

    test("new relationship to a new class depends on its create item and uses the provisional profile id", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [
          createClass({ id: "s-food", name: { en: "Food" } }),
          createRelationship({
            id: "s-eats",
            ends: [
              { iri: null, concept: ids.person, name: {}, description: {}, cardinality: undefined },
              { iri: "eats", concept: "s-food", name: { en: "eats" }, description: {}, cardinality: undefined },
            ],
          }),
        ],
        profileModel.getEntities(),
      );

      const classItem = analysis.items.find((i) => i.kind === "create-class-profile") as CreateClassProfileItem;
      const relItem = analysis.items.find((i) => i.kind === "create-relationship-profile") as CreateRelationshipProfileItem;
      expect(classItem).toBeDefined();
      expect(relItem).toBeDefined();
      expect(relItem.dependsOn).toEqual([classItem.id]);
      expect(relItem.domainProfileId).toBe("p-person");
      expect(relItem.rangeProfileId).toBe(classItem.newProfileId);
      expect((relItem.operations[0] as any).entity.ends[1].concept).toBe(classItem.newProfileId);
    });

    test("new relationship between classes with no profiles produces no item", () => {
      const { model } = buildSemanticModel();
      const emptyProfile = createWritableInMemoryProfileModel({ identifier: "profile", baseIri: null });

      const analysis = analyzeEvolution(
        model.getEntities(),
        [
          createRelationship({
            id: "s-rel",
            ends: [
              { iri: null, concept: "s-person", name: {}, description: {}, cardinality: undefined },
              { iri: "x", concept: "s-animal", name: {}, description: {}, cardinality: undefined },
            ],
          }),
        ],
        emptyProfile.getEntities(),
      );

      expect(analysis.items).toHaveLength(0);
    });

    test("create followed by modify collapses into a single create item with final values", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [
          createClass({ id: "s-newClass", name: { en: "Draft Name" } }),
          modifyClass("s-newClass", { name: { en: "Final Name" } }),
        ],
        profileModel.getEntities(),
      );

      expect(analysis.items).toHaveLength(1);
      const item = analysis.items[0] as CreateClassProfileItem;
      expect(item.kind).toBe("create-class-profile");
      expect((item.source.after as any).name).toEqual({ en: "Final Name" });
    });

    test("new generalization between profiled classes produces one item per profile combination", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      // Second profile of Animal → two combinations for child = animal.
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-animal2",
          profiling: [ids.animal],
          name: { en: "Beast" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }),
      ]);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [createGeneralization({ id: "s-gen2", iri: null, child: ids.animal, parent: ids.livingThing } as any)],
        profileModel.getEntities(),
      );

      const genItems = analysis.items.filter((i) => i.kind === "create-generalization-profile");
      expect(genItems).toHaveLength(2);
      expect(genItems.map((i: any) => i.childProfileId).sort()).toEqual(["p-animal", "p-animal2"]);
    });

  });

  describe("modified entities", () => {

    test("name change with inherited name is automatic with a freeze-old choice", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyClass(ids.person, { name: { en: "Human" } })],
        profileModel.getEntities(),
      );

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      expect(item).toBeDefined();
      expect(item.profileId).toBe("p-person");
      expect(item.severity).toBe("automatic");

      const decision = item.decisions.find((d) => d.field === "name")!;
      expect(decision.profileState).toBe("inherits");
      expect(decision.defaultChoiceId).toBe("inherit");
      const freeze = decision.choices.find((c) => c.id === "freeze-old")!;
      expect((freeze.operations[0] as any).entity.name).toEqual({ en: "Person" });
      expect((freeze.operations[0] as any).entity.nameFromProfiled).toBeNull();
    });

    test("one modify item per profile when a class has multiple profiles", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-person2",
          profiling: [ids.person],
          name: null,
          nameFromProfiled: ids.person,
          description: null,
          descriptionFromProfiled: ids.person,
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }),
      ]);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyClass(ids.person, { name: { en: "Human" } })],
        profileModel.getEntities(),
      );

      const items = analysis.items.filter((i) => i.kind === "modify-profile") as ModifyProfileItem[];
      expect(items.map((i) => i.profileId).sort()).toEqual(["p-person", "p-person2"]);
    });

    test("name change conflicting with an override needs attention", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({ identifier: "profile", baseIri: null });
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-person",
          profiling: [ids.person],
          name: { en: "My Person" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }),
      ]);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyClass(ids.person, { name: { en: "Human" } })],
        profileModel.getEntities(),
      );

      const item = analysis.items[0] as ModifyProfileItem;
      expect(item.severity).toBe("attention");
      const decision = item.decisions.find((d) => d.field === "name")!;
      expect(decision.profileState).toBe("override-differs");
      expect(decision.defaultChoiceId).toBe("keep-own");
      expect(decision.choices.map((c) => c.id).sort()).toEqual(["adopt-new", "inherit", "keep-own"]);
      const adopt = decision.choices.find((c) => c.id === "adopt-new")!;
      expect((adopt.operations[0] as any).entity.name).toEqual({ en: "Human" });
    });

    test("override matching the new value offers to drop the override", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({ identifier: "profile", baseIri: null });
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-person",
          profiling: [ids.person],
          name: { en: "Human" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }),
      ]);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyClass(ids.person, { name: { en: "Human" } })],
        profileModel.getEntities(),
      );

      const item = analysis.items[0] as ModifyProfileItem;
      const decision = item.decisions.find((d) => d.field === "name")!;
      expect(decision.profileState).toBe("override-matches-new");
      expect(decision.severity).toBe("decision");
      expect(decision.defaultChoiceId).toBe("drop-override");
    });

    test("cardinality change with inherited cardinality is automatic", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyRelationEnd(ids.hasPet, 1, { cardinality: [0, 5] })],
        profileModel.getEntities(),
      );

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      expect(item.profileId).toBe("p-hasPet");
      const decision = item.decisions.find((d) => d.field === "cardinality")!;
      expect(decision.endRole).toBe("range");
      expect(decision.profileState).toBe("inherits");
      expect(decision.severity).toBe("automatic");
    });

    test("range retyping offers retargeting the profile end", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [modifyRelationEnd(ids.hasPet, 1, { concept: ids.livingThing })],
        profileModel.getEntities(),
      );

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      const decision = item.decisions.find((d) => d.field === "concept")!;
      expect(decision.endRole).toBe("range");
      expect(decision.severity).toBe("attention");
      // Exactly one candidate (p-livingThing) → retarget is the default.
      expect(decision.defaultChoiceId).toBe("retarget:p-livingThing");
      const retarget = decision.choices.find((c) => c.id === "retarget:p-livingThing")!;
      expect((retarget.operations[0] as any).end.concept).toBe("p-livingThing");
    });

    test("multiple operations on one class collapse into one item", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [
          modifyClass(ids.person, { name: { en: "Human" } }),
          modifyClass(ids.person, { description: { en: "A human being." } }),
        ],
        profileModel.getEntities(),
      );

      const items = analysis.items.filter((i) => i.kind === "modify-profile") as ModifyProfileItem[];
      expect(items).toHaveLength(1);
      expect(items[0].decisions.map((d) => d.field).sort()).toEqual(["description", "name"]);
    });

  });

  describe("deleted entities", () => {

    test("deleted class produces a delete item with cascade and a detach choice", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [deleteEntity(ids.person)],
        profileModel.getEntities(),
      );

      const item = analysis.items.find(
        (i) => i.kind === "delete-profile" && (i as DeleteProfileItem).profileType === "class-profile",
      ) as DeleteProfileItem;
      expect(item).toBeDefined();
      expect(item.severity).toBe("attention");
      expect(item.cascade.relationshipProfileIds).toContain("p-hasPet");
      expect(item.cascade.generalizationIds).toHaveLength(1);
      expect(item.defaultChoiceId).toBe("delete");

      const detach = item.choices.find((c) => c.id === "detach")!;
      const detachOp = detach.operations[0] as any;
      expect(detachOp.entity.profiling).toEqual([]);
      // Inherited name is frozen to the deleted entity's value.
      expect(detachOp.entity.name).toEqual({ en: "Person" });
      expect(detachOp.entity.nameFromProfiled).toBeNull();
    });

    test("detach is the default when the profile profiles other entities too", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({ identifier: "profile", baseIri: null });
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-both",
          profiling: [ids.person, ids.animal],
          name: { en: "Both" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }),
      ]);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [deleteEntity(ids.person)],
        profileModel.getEntities(),
      );

      const item = analysis.items[0] as DeleteProfileItem;
      expect(item.defaultChoiceId).toBe("detach");
      const detachOp = item.choices.find((c) => c.id === "detach")!.operations[0] as any;
      expect(detachOp.entity.profiling).toEqual([ids.animal]);
    });

    test("deleted generalization produces a delete item for the profile generalization", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [deleteEntity(ids.gen1)],
        profileModel.getEntities(),
      );

      const item = analysis.items.find(
        (i) => i.kind === "delete-profile" && (i as DeleteProfileItem).profileType === "generalization",
      ) as DeleteProfileItem;
      expect(item).toBeDefined();
      expect(item.severity).toBe("decision");
      expect(item.defaultChoiceId).toBe("delete");
    });

    test("delete of an entity without profiles produces no items", () => {
      const { model, ids } = buildSemanticModel();
      const emptyProfile = createWritableInMemoryProfileModel({ identifier: "profile", baseIri: null });

      const analysis = analyzeEvolution(
        model.getEntities(),
        [deleteEntity(ids.person)],
        emptyProfile.getEntities(),
      );

      expect(analysis.items).toHaveLength(0);
    });

  });

  describe("upstream after state", () => {

    test("returns the upstream entities with all operations applied", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(ids);

      const analysis = analyzeEvolution(
        model.getEntities(),
        [
          modifyClass(ids.person, { name: { en: "Human" } }),
          deleteEntity(ids.animal),
          createClass({ id: "s-new", name: { en: "New" } }),
        ],
        profileModel.getEntities(),
      );

      expect((analysis.upstreamAfter[ids.person] as any).name).toEqual({ en: "Human" });
      expect(analysis.upstreamAfter[ids.animal]).toBeUndefined();
      expect(analysis.upstreamAfter["s-new"]).toBeDefined();
      // The input state is not modified.
      expect((model.getEntities()[ids.person] as any).name).toEqual({ en: "Person" });
    });

  });

});
