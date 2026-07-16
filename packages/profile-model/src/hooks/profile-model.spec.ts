import { describe, test, expect } from "vitest";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { deleteEntity } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  ApplicationProfileAggregator,
  VocabularyAggregator,
  type EntityModel,
  type SemanticModelAggregator,
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createWritableInMemoryProfileModel } from "../index.ts";
import type {
  CreateClassProfileItem,
  CreateRelationshipProfileItem,
  DeleteProfileItem,
  ModifyProfileItem,
} from "./evolution-items.ts";
import { analyzeProfileEvolution } from "./profile-model.ts";

const profileFactory = createDefaultSemanticModelProfileOperationFactory();

const VOCABULARY_ID = "vocabulary";
const PARENT_ID = "parent";

/**
 * Vocabulary: Person --hasPet--> Animal, plus LivingThing.
 */
function buildVocabulary(): EntityRecord {
  const builder = createDefaultSemanticModelBuilder({
    baseIdentifier: "s-",
    baseIri: "http://example.com/",
  });
  builder.class({ id: "s-livingThing", name: { en: "Living Thing" } });
  const person = builder.class({ id: "s-person", name: { en: "Person" }, description: { en: "A human." } });
  const animal = builder.class({ id: "s-animal", name: { en: "Animal" } });
  builder.property({ id: "s-hasPet", iri: "hasPet", name: { en: "has pet" } })
    .domain(person)
    .range(animal);
  return builder.build().getEntities();
}

function createClassProfileOperation(id: string, profiledId: string) {
  return profileFactory.createClassProfile({
    id,
    iri: id,
    profiling: [profiledId],
    name: null,
    nameFromProfiled: profiledId,
    description: null,
    descriptionFromProfiled: profiledId,
    usageNote: null,
    usageNoteFromProfiled: null,
    externalDocumentationUrl: null,
    tags: [],
  });
}

function createRelationshipProfileOperation(
  id: string,
  domainConcept: string,
  rangeConcept: string,
  profiledId: string,
) {
  return profileFactory.createRelationshipProfile({
    id,
    ends: [
      {
        iri: null,
        concept: domainConcept,
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
        concept: rangeConcept,
        cardinality: null,
        name: null,
        nameFromProfiled: profiledId,
        description: null,
        descriptionFromProfiled: profiledId,
        usageNote: null,
        usageNoteFromProfiled: null,
        profiling: [profiledId],
        externalDocumentationUrl: null,
        tags: [],
      },
    ],
  });
}

/**
 * Parent application profile of the vocabulary: pp-person, pp-animal,
 * pp-livingThing and pp-hasPet, everything inherited.
 */
function buildParentProfile(): EntityRecord {
  const model = createWritableInMemoryProfileModel({ identifier: PARENT_ID, baseIri: null });
  model.executeOperations([
    createClassProfileOperation("pp-person", "s-person"),
    createClassProfileOperation("pp-animal", "s-animal"),
    createClassProfileOperation("pp-livingThing", "s-livingThing"),
    createRelationshipProfileOperation("pp-hasPet", "pp-person", "pp-animal", "s-hasPet"),
  ]);
  return model.getEntities();
}

/**
 * Child application profile of the parent profile: cp-person, cp-animal,
 * cp-livingThing and cp-hasPet, everything inherited from the parent —
 * for cp-person including the usage note.
 */
function buildChildProfile(): EntityRecord {
  const model = createWritableInMemoryProfileModel({ identifier: "child", baseIri: null });
  model.executeOperations([
    createClassProfileOperation("cp-person", "pp-person"),
    createClassProfileOperation("cp-animal", "pp-animal"),
    createClassProfileOperation("cp-livingThing", "pp-livingThing"),
    createRelationshipProfileOperation("cp-hasPet", "cp-person", "cp-animal", "pp-hasPet"),
    profileFactory.modifyClassProfile("cp-person", { usageNoteFromProfiled: "pp-person" }),
  ]);
  return model.getEntities();
}

function asEntityModel(entities: EntityRecord): EntityModel {
  return {
    getEntities: () => entities,
    subscribeToChanges: () => {},
    executeOperation: () => {},
  };
}

/**
 * Stands in for the aggregator built by
 * `@dataspecer/specification/model-hierarchy` in production: the parent
 * application profile on top of the vocabulary.
 */
function buildAggregator(models: Record<string, EntityRecord>): SemanticModelAggregator {
  const vocabulary = new VocabularyAggregator(asEntityModel(models[VOCABULARY_ID]!));
  // The aggregator identifies the profile model by its main entity.
  const parentEntities: EntityRecord = {
    ...models[PARENT_ID]!,
    [PARENT_ID]: { id: PARENT_ID, type: [LOCAL_SEMANTIC_MODEL] },
  };
  return new ApplicationProfileAggregator(asEntityModel(parentEntities), vocabulary, true);
}

function analyze(operations: Parameters<typeof analyzeProfileEvolution>[0]["operations"]) {
  return analyzeProfileEvolution({
    models: {
      [VOCABULARY_ID]: buildVocabulary(),
      [PARENT_ID]: buildParentProfile(),
    },
    upstreamModelId: PARENT_ID,
    operations,
    profileEntities: buildChildProfile(),
    buildAggregator,
  });
}

describe("analyzeProfileEvolution", () => {

  describe("modified entities", () => {

    test("overriding an inherited name diffs against the effective (aggregated) value", () => {
      const analysis = analyze([
        profileFactory.modifyClassProfile("pp-person", { name: { en: "Human" }, nameFromProfiled: null }),
      ]);

      expect(analysis.items).toHaveLength(1);
      const item = analysis.items[0] as ModifyProfileItem;
      expect(item.kind).toBe("modify-profile");
      expect(item.profileId).toBe("cp-person");
      expect(item.severity).toBe("automatic");

      const decision = item.decisions.find((d) => d.field === "name")!;
      // The old value is the name inherited from the vocabulary, not the raw
      // null stored on the parent profile.
      expect(decision.oldValue).toEqual({ en: "Person" });
      expect(decision.newValue).toEqual({ en: "Human" });
      expect(decision.profileState).toBe("inherits");
      const freeze = decision.choices.find((c) => c.id === "freeze-old")!;
      expect((freeze.operations[0] as any).entity.name).toEqual({ en: "Person" });
    });

    test("an override equal to the inherited value produces no items", () => {
      const analysis = analyze([
        profileFactory.modifyClassProfile("pp-person", { name: { en: "Person" }, nameFromProfiled: null }),
      ]);

      expect(analysis.items).toHaveLength(0);
    });

    test("usage note change produces an inheritable usage note decision", () => {
      const analysis = analyze([
        profileFactory.modifyClassProfile("pp-person", { usageNote: { en: "Use with care." } }),
      ]);

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      expect(item.profileId).toBe("cp-person");
      const decision = item.decisions.find((d) => d.field === "usageNote")!;
      expect(decision.newValue).toEqual({ en: "Use with care." });
      // The child inherits the usage note from the parent profile.
      expect(decision.profileState).toBe("inherits");
      expect(decision.severity).toBe("automatic");
    });

    test("relationship end name change maps ends by index and freezes the effective value", () => {
      const analysis = analyze([
        profileFactory.modifyRelationshipEndProfile("pp-hasPet", 1, { name: { en: "owns" }, nameFromProfiled: null }),
      ]);

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      expect(item.profileId).toBe("cp-hasPet");
      const decision = item.decisions.find((d) => d.field === "name")!;
      expect(decision.endRole).toBe("range");
      expect(decision.oldValue).toEqual({ en: "has pet" });
      expect(decision.profileState).toBe("inherits");
      const freeze = decision.choices.find((c) => c.id === "freeze-old")!;
      expect((freeze.operations[0] as any).end.name).toEqual({ en: "has pet" });
    });

    test("retyped relationship end offers retargeting to the child profile of the new concept", () => {
      const analysis = analyze([
        profileFactory.modifyRelationshipEndProfile("pp-hasPet", 1, { concept: "pp-livingThing" }),
      ]);

      const item = analysis.items.find((i) => i.kind === "modify-profile") as ModifyProfileItem;
      const decision = item.decisions.find((d) => d.field === "concept")!;
      expect(decision.endRole).toBe("range");
      expect(decision.defaultChoiceId).toBe("retarget:cp-livingThing");
      const retarget = decision.choices.find((c) => c.id === "retarget:cp-livingThing")!;
      expect((retarget.operations[0] as any).end.concept).toBe("cp-livingThing");
    });

  });

  describe("created entities", () => {

    test("new class profile upstream proposes a child profile inheriting the usage note", () => {
      const analysis = analyze([
        createClassProfileOperation("pp-animal2", "s-animal"),
      ]);

      expect(analysis.items).toHaveLength(1);
      const item = analysis.items[0] as CreateClassProfileItem;
      expect(item.kind).toBe("create-class-profile");
      const entity = (item.operations[0] as any).entity;
      expect(entity.profiling).toEqual(["pp-animal2"]);
      expect(entity.nameFromProfiled).toBe("pp-animal2");
      // Unlike a plain class, a profile carries a usage note to inherit.
      expect(entity.usageNoteFromProfiled).toBe("pp-animal2");
      // The source shows the aggregated state — the name flows from the vocabulary.
      expect((item.source.after as any).name).toEqual({ en: "Animal" });
    });

    test("new relationship profile upstream proposes a child profile between the child class profiles", () => {
      const analysis = analyze([
        createRelationshipProfileOperation("pp-likes", "pp-person", "pp-animal", "s-hasPet"),
      ]);

      const item = analysis.items.find((i) => i.kind === "create-relationship-profile") as CreateRelationshipProfileItem;
      expect(item).toBeDefined();
      expect(item.domainProfileId).toBe("cp-person");
      expect(item.rangeProfileId).toBe("cp-animal");
      const ends = (item.operations[0] as any).entity.ends;
      expect(ends[0].concept).toBe("cp-person");
      expect(ends[1].concept).toBe("cp-animal");
      expect(ends[1].profiling).toEqual(["pp-likes"]);
      expect(ends[1].usageNoteFromProfiled).toBe("pp-likes");
    });

  });

  describe("deleted entities", () => {

    test("deleted class profile cascades and detach freezes the effective values", () => {
      const analysis = analyze([deleteEntity("pp-person")]);

      const item = analysis.items.find(
        (i) => i.kind === "delete-profile" && (i as DeleteProfileItem).profileType === "class-profile",
      ) as DeleteProfileItem;
      expect(item).toBeDefined();
      expect(item.profileId).toBe("cp-person");
      expect(item.cascade.relationshipProfileIds).toContain("cp-hasPet");

      const detach = item.choices.find((c) => c.id === "detach")!;
      const detachOp = detach.operations[0] as any;
      expect(detachOp.entity.profiling).toEqual([]);
      // The frozen name is the effective one, inherited from the vocabulary.
      expect(detachOp.entity.name).toEqual({ en: "Person" });
      expect(detachOp.entity.nameFromProfiled).toBeNull();
    });

  });

  describe("aggregated after state", () => {

    test("upstreamAfter carries the aggregated upstream profile", () => {
      const analysis = analyze([
        profileFactory.modifyClassProfile("pp-person", { name: { en: "Human" }, nameFromProfiled: null }),
      ]);

      expect((analysis.upstreamAfter["pp-person"] as any).name).toEqual({ en: "Human" });
      // Values of untouched entities are resolved too.
      expect((analysis.upstreamAfter["pp-animal"] as any).name).toEqual({ en: "Animal" });
    });

  });

});
