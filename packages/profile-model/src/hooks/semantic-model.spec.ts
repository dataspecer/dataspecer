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
import { reactToSemanticModelOperation } from "./semantic-model.ts";
import type { SemanticModel } from "@dataspecer/semantic-model";
import type { WritableProfileModel } from "../profile-model.ts";

const profileFactory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Build a semantic model with: Person --hasPet--> Animal
 * Person is a specialization of LivingThing.
 * Returns the model and entity IDs.
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
 * Build a profile model that profiles Person and Animal from the semantic model,
 * plus a relationship profile for hasPet and a generalization.
 */
function buildProfileModel(semanticModel: SemanticModel, ids: ReturnType<typeof buildSemanticModel>["ids"]): WritableProfileModel {
  const profileModel = createWritableInMemoryProfileModel({
    identifier: "profile",
    baseIri: "http://profile.example.com/",
  });

  // Profile Person class
  profileModel.executeOperations([
    profileFactory.createClassProfile({
      id: "p-person",
      iri: "p-person",
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

  // Profile Animal class
  profileModel.executeOperations([
    profileFactory.createClassProfile({
      id: "p-animal",
      iri: "p-animal",
      profiling: [ids.animal],
      name: null,
      nameFromProfiled: ids.animal,
      description: null,
      descriptionFromProfiled: ids.animal,
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }),
  ]);

  // Profile LivingThing class
  profileModel.executeOperations([
    profileFactory.createClassProfile({
      id: "p-livingThing",
      iri: "p-livingThing",
      profiling: [ids.livingThing],
      name: null,
      nameFromProfiled: ids.livingThing,
      description: null,
      descriptionFromProfiled: ids.livingThing,
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }),
  ]);

  // Profile hasPet relationship
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

  // Generalization: p-person specializes p-livingThing
  profileModel.executeOperations([
    createGeneralization({
      iri: null,
      child: "p-person",
      parent: "p-livingThing",
    }),
  ]);

  return profileModel;
}

describe("reactToSemanticModelOperation", () => {

  describe("CreateClassOperation", () => {

    test("proposes creating a class profile", () => {
      const { model } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: "http://profile.example.com/",
      });

      const op = createClass({ id: "s-newClass", name: { en: "New Class" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      expect(proposals).toHaveLength(1);
      expect(proposals[0].label).toContain("New Class");
      expect(proposals[0].operations).toHaveLength(1);
      expect(proposals[0].operations[0].type).toBe("create-class-profile");
    });

    test("proposed class profile inherits name and description from profiled", () => {
      const { model } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      const op = createClass({ id: "s-newClass", name: { en: "New Class" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      const createOp = proposals[0].operations[0] as any;

      expect(createOp.entity.nameFromProfiled).toBe("s-newClass");
      expect(createOp.entity.descriptionFromProfiled).toBe("s-newClass");
      expect(createOp.entity.profiling).toContain("s-newClass");
    });

  });

  describe("ModifyClassOperation — name change", () => {

    test("when profile inherits name, proposes to freeze old name", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      // Person profile inherits name from profiled (nameFromProfiled = ids.person)
      const op = modifyClass(ids.person, { name: { en: "Human" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const freezeProposal = proposals.find(p => p.label.includes("Keep old name"));
      expect(freezeProposal).toBeDefined();
      const modOp = freezeProposal!.operations[0] as any;
      expect(modOp.entity.name).toEqual({ en: "Person" });
      expect(modOp.entity.nameFromProfiled).toBeNull();
    });

    test("does not propose freeze when no profiles exist", () => {
      const { model, ids } = buildSemanticModel();
      const emptyProfile = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      const op = modifyClass(ids.person, { name: { en: "Human" } });
      const proposals = reactToSemanticModelOperation(model, op, emptyProfile);

      expect(proposals).toHaveLength(0);
    });

    test("when profile has own name, proposes adopting new name and inheriting", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      // Create a class profile that has its OWN name (not inherited)
      profileModel.executeOperations([
        profileFactory.createClassProfile({
          id: "p-person",
          iri: null,
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

      const op = modifyClass(ids.person, { name: { en: "Human" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const adoptProposal = proposals.find(p => p.label.includes("Update name"));
      const inheritProposal = proposals.find(p => p.label.includes("Inherit new name"));

      expect(adoptProposal).toBeDefined();
      expect(inheritProposal).toBeDefined();

      const adoptOp = adoptProposal!.operations[0] as any;
      expect(adoptOp.entity.name).toEqual({ en: "Human" });

      const inheritOp = inheritProposal!.operations[0] as any;
      expect(inheritOp.entity.nameFromProfiled).toBe(ids.person);
    });

  });

  describe("ModifyClassOperation — description change", () => {

    test("when profile inherits description, proposes to freeze old description", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = modifyClass(ids.person, { description: { en: "Updated description." } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const freezeProposal = proposals.find(p => p.label.includes("Keep old description"));
      expect(freezeProposal).toBeDefined();
      const modOp = freezeProposal!.operations[0] as any;
      expect(modOp.entity.description).toEqual({ en: "A human." });
      expect(modOp.entity.descriptionFromProfiled).toBeNull();
    });

  });

  describe("ModifyClassOperation — IRI change", () => {

    test("proposes to update profile IRI", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = modifyClass(ids.person, { iri: "new-person-iri" });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const iriProposal = proposals.find(p => p.label.includes("Update profile IRI"));
      expect(iriProposal).toBeDefined();
    });

  });

  describe("CreateRelationshipOperation", () => {

    test("proposes relationship profile when both ends are profiled", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      // Create a new relationship between Person and Animal
      const op = createRelationship({
        id: "s-newRel",
        iri: null,
        ends: [
          { iri: null, concept: ids.person, name: {}, description: {}, cardinality: undefined },
          { iri: "owns", concept: ids.animal, name: { en: "owns" }, description: {}, cardinality: undefined },
        ],
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].label).toContain("Create relationship profile");

      const createOp = proposals[0].operations[0] as any;
      expect(createOp.type).toBe("create-relation-profile");
      // Domain should be p-person, range should be p-animal
      expect(createOp.entity.ends[0].concept).toBe("p-person");
      expect(createOp.entity.ends[1].concept).toBe("p-animal");
    });

    test("does not propose when domain class is not profiled", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = createRelationship({
        id: "s-newRel",
        iri: null,
        ends: [
          { iri: null, concept: "s-unknown-class", name: {}, description: {}, cardinality: undefined },
          { iri: "owns", concept: ids.animal, name: {}, description: {}, cardinality: undefined },
        ],
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals).toHaveLength(0);
    });

    test("does not propose when range class is not profiled", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = createRelationship({
        id: "s-newRel",
        iri: null,
        ends: [
          { iri: null, concept: ids.person, name: {}, description: {}, cardinality: undefined },
          { iri: "owns", concept: "s-unknown-class", name: {}, description: {}, cardinality: undefined },
        ],
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals).toHaveLength(0);
    });

    test("proposed relationship profile inherits name from profiled relationship", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = createRelationship({
        id: "s-newRel",
        ends: [
          { iri: null, concept: ids.person, name: {}, description: {}, cardinality: undefined },
          { iri: "owns", concept: ids.animal, name: { en: "owns" }, description: {}, cardinality: undefined },
        ],
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      const createOp = proposals[0].operations[0] as any;
      expect(createOp.entity.ends[1].nameFromProfiled).toBe("s-newRel");
      expect(createOp.entity.ends[1].profiling).toContain("s-newRel");
    });

  });

  describe("ModifyRelationEndOperation — name change", () => {

    test("when profile inherits name, proposes to freeze old name", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      // hasPet's range end (index 1) has iri="hasPet", so it's the range end.
      const op = modifyRelationEnd(ids.hasPet, 1, { name: { en: "owns pet" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const freezeProposal = proposals.find(p => p.label.includes("Keep old name"));
      expect(freezeProposal).toBeDefined();
      const endOp = freezeProposal!.operations[0] as any;
      expect(endOp.end.nameFromProfiled).toBeNull();
      expect(endOp.end.name).toEqual({ en: "has pet" });
    });

    test("when profile has own name, proposes adopting or inheriting", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      // Create a relationship profile that has its OWN name
      profileModel.executeOperations([
        profileFactory.createRelationshipProfile({
          id: "p-hasPet",
          ends: [
            {
              iri: null,
              concept: ids.person,
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
              concept: ids.animal,
              cardinality: null,
              name: { en: "my has pet" },
              nameFromProfiled: null, // own name, not inherited
              description: null,
              descriptionFromProfiled: null,
              usageNote: null,
              usageNoteFromProfiled: null,
              profiling: [ids.hasPet],
              externalDocumentationUrl: null,
              tags: [],
            },
          ],
        }),
      ]);

      const op = modifyRelationEnd(ids.hasPet, 1, { name: { en: "owns pet" } });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const adoptProposal = proposals.find(p => p.label.includes('Update name to "owns pet"'));
      const inheritProposal = proposals.find(p => p.label.includes("Inherit new name"));
      expect(adoptProposal).toBeDefined();
      expect(inheritProposal).toBeDefined();
    });

  });

  describe("ModifyRelationEndOperation — cardinality change", () => {

    test("proposes updating cardinality and keeping old", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = modifyRelationEnd(ids.hasPet, 1, { cardinality: [0, 5] });
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      const updateProposal = proposals.find(p => p.label.includes("Update cardinality to [0..5]"));
      const keepProposal = proposals.find(p => p.label.includes("Keep old cardinality"));
      expect(updateProposal).toBeDefined();
      expect(keepProposal).toBeDefined();
    });

  });

  describe("CreateGeneralizationOperation", () => {

    test("proposes generalization profile when both class profiles exist", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      // Already have p-person and p-animal profiled. Create a generalization between them.
      const op = createGeneralization({
        iri: null,
        child: ids.person,
        parent: ids.animal,
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals.length).toBeGreaterThan(0);

      const createOp = proposals[0].operations[0] as any;
      expect(createOp.entity.child).toBe("p-person");
      expect(createOp.entity.parent).toBe("p-animal");
    });

    test("does not propose when parent class is not profiled", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = createGeneralization({
        iri: null,
        child: ids.person,
        parent: "s-unknown",
      });

      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals).toHaveLength(0);
    });

  });

  describe("DeleteEntityOperation — class", () => {

    test("proposes deleting class profile and cascades to related profiles", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = deleteEntity(ids.person);
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      expect(proposals.length).toBeGreaterThan(0);

      const deleteProposal = proposals.find(p => p.label.includes("Delete class profile"));
      expect(deleteProposal).toBeDefined();

      // Expect cascade: relationship profile and generalization should also be deleted
      expect(deleteProposal!.operations.length).toBeGreaterThan(1);
    });

    test("does not propose when no profile exists for the class", () => {
      const { model, ids } = buildSemanticModel();
      const emptyProfile = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      const op = deleteEntity(ids.person);
      const proposals = reactToSemanticModelOperation(model, op, emptyProfile);
      expect(proposals).toHaveLength(0);
    });

  });

  describe("DeleteEntityOperation — relationship", () => {

    test("proposes deleting relationship profile", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = deleteEntity(ids.hasPet);
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      expect(proposals.length).toBeGreaterThan(0);
      const deleteProposal = proposals.find(p => p.label.includes("Delete relationship profile"));
      expect(deleteProposal).toBeDefined();
    });

  });

  describe("DeleteEntityOperation — generalization", () => {

    test("proposes deleting the corresponding generalization in profile", () => {
      const { model, ids } = buildSemanticModel();
      const profileModel = buildProfileModel(model, ids);

      const op = deleteEntity(ids.gen1);
      const proposals = reactToSemanticModelOperation(model, op, profileModel);

      expect(proposals.length).toBeGreaterThan(0);
      const deleteProposal = proposals.find(p => p.label.includes("Delete generalization profile"));
      expect(deleteProposal).toBeDefined();
    });

  });

  describe("unknown operation", () => {

    test("returns empty array for unknown operation types", () => {
      const { model } = buildSemanticModel();
      const profileModel = createWritableInMemoryProfileModel({
        identifier: "profile",
        baseIri: null,
      });

      const op = { id: "op-x", type: "unknown-type" } as any;
      const proposals = reactToSemanticModelOperation(model, op, profileModel);
      expect(proposals).toHaveLength(0);
    });

  });

});
