import { describe, test, expect } from "vitest";
import { createDefaultProfileModelBuilder } from "../default-profile-model-builder.ts";
import { margeProfileModels } from "./profile-model-merger.ts";
import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  ControlledVocabularyAssignment,
  ProfileClass,
  ProfileModel,
} from "../profile-model.ts";

/**
 * Adds an entity to a built model's entities - used to attach a standalone
 * ControlledVocabularyAssignment, which the builder has no dedicated method
 * for.
 */
function withExtraEntity(model: ProfileModel, entity: ControlledVocabularyAssignment): ProfileModel {
  return {
    getId: () => model.getId(),
    getBaseIri: () => model.getBaseIri(),
    getEntities: () => ({ ...model.getEntities(), [entity.id]: entity }),
  };
}

describe("margeProfileModels", () => {

  test("Default merge test.", () => {

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "first:",
    });

    first.class({ iri: "Person" });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "second:",
    });

    second.property({ iri: "name" })
      .range("http://www.w3.org/2001/XMLSchema#string");

    // Actual

    const actual = margeProfileModels("merge", [first.build(), second.build()]);

    // Expected

    const expected = createDefaultProfileModelBuilder({
      baseIdentifier: "",
      baseIri: null,
    });

    expected.class({
      // Identifiers are preserved.
      id: "first:001",
      iri: "http://example.com/first#Person"
    });

    expected.property({
      id: "second:001",
      iri: "http://example.com/second#name",
    }).range("http://www.w3.org/2001/XMLSchema#string");

    // Test

    expect(actual.getId() === "merge");
    expect(actual.getBaseIri() === null);
    expect(actual.getEntities()).toEqual(expected.build().getEntities());

  });

  test("Merge by identifier.", () => {

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "first:"
    });

    first.class({
      iri: "Person",
      name: { "cs": "Osoba" },
    });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "first:"
    });

    second.class({
      iri: "Person",
      name: { "cs": "Člověk", "en": "Person" },
      description: { "cs": "Popis osoby." },
    });

    // Actual

    const actual = margeProfileModels("merge", [first.build(), second.build()]);

    // Expected

    const expected = createDefaultProfileModelBuilder({
      baseIdentifier: "first:",
      baseIri: null,
    });

    expected.class({
      iri: "http://example.com/first#Person",
      name: { "cs": "Osoba", "en": "Person" },
      description: { "cs": "Popis osoby." },
    });

    // Test

    expect(actual.getEntities()).toEqual(expected.build().getEntities());

  });

  test("Two models' own assignments for the same vocabulary on the same class profile collapse to one (left wins).", () => {

    function assignmentFixture(
      overrides: Partial<ControlledVocabularyAssignment>,
    ): ControlledVocabularyAssignment {
      return {
        id: "cv", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
        classProfile: "shared", vocabulary: "voc-1", qualifier: "MUST",
        replaces: null, iri: null,
        ...overrides,
      };
    }

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "shared:",
    });
    first.class({ id: "shared", iri: "Person", controlledVocabularies: ["cv-left"] });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "shared:",
    });
    second.class({ id: "shared", iri: "Person", controlledVocabularies: ["cv-right"] });

    const actual = margeProfileModels("merge", [
      withExtraEntity(first.build(), assignmentFixture({ id: "cv-left", qualifier: "MUST" })),
      withExtraEntity(second.build(), assignmentFixture({ id: "cv-right", qualifier: "RECOMMENDED" })),
    ]);

    const mergedClassProfile = actual.getEntities()["shared"] as ProfileClass;
    expect(mergedClassProfile.controlledVocabularies).toStrictEqual(["cv-left"]);

  });

  test("Same-vocabulary assignments on two different (non-conflicting) class profiles are both kept - dedup only applies within a single merged class profile.", () => {

    function assignmentFixture(
      overrides: Partial<ControlledVocabularyAssignment>,
    ): ControlledVocabularyAssignment {
      return {
        id: "cv", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
        classProfile: "cv", vocabulary: "voc-1", qualifier: "MUST",
        replaces: null, iri: null,
        ...overrides,
      };
    }

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "first:",
    });
    first.class({ id: "class-1", iri: "Class1", controlledVocabularies: ["cv-1"] });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "second:",
    });
    second.class({ id: "class-2", iri: "Class2", controlledVocabularies: ["cv-2"] });

    const actual = margeProfileModels("merge", [
      withExtraEntity(first.build(), assignmentFixture({ id: "cv-1", classProfile: "class-1" })),
      withExtraEntity(second.build(), assignmentFixture({ id: "cv-2", classProfile: "class-2" })),
    ]);

    expect((actual.getEntities()["class-1"] as ProfileClass).controlledVocabularies)
      .toStrictEqual(["cv-1"]);
    expect((actual.getEntities()["class-2"] as ProfileClass).controlledVocabularies)
      .toStrictEqual(["cv-2"]);

  });

});
