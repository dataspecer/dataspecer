import { describe, test, expect } from "vitest";
import { createDefaultProfileModelBuilder } from "../default-profile-model-builder.ts";
import { margeProfileModels } from "./profile-model-merger.ts";
import {
  ProfileClass,
} from "../profile-model.ts";

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

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "shared:",
    });
    first.class({ id: "shared", iri: "Person", controlledVocabularies: ["cv-left"] });
    first.controlledVocabularyAssignment({
      id: "cv-left", classProfile: "shared", vocabulary: "voc-1", qualifier: "MUST",
    });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "shared:",
    });
    second.class({ id: "shared", iri: "Person", controlledVocabularies: ["cv-right"] });
    second.controlledVocabularyAssignment({
      id: "cv-right", classProfile: "shared", vocabulary: "voc-1", qualifier: "RECOMMENDED",
    });

    const actual = margeProfileModels("merge", [
      first.build(),
      second.build(),
    ]);

    const mergedClassProfile = actual.getEntities()["shared"] as ProfileClass;
    expect(mergedClassProfile.controlledVocabularies).toStrictEqual(["cv-left"]);

  });

  test("Same-vocabulary assignments on two different (non-conflicting) class profiles are both kept - dedup only applies within a single merged class profile.", () => {

    const first = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "first:",
    });
    first.class({ id: "class-1", iri: "Class1", controlledVocabularies: ["cv-1"] });
    first.controlledVocabularyAssignment({ id: "cv-1", classProfile: "class-1", vocabulary: "voc-1" });

    const second = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "second:",
    });
    second.class({ id: "class-2", iri: "Class2", controlledVocabularies: ["cv-2"] });
    second.controlledVocabularyAssignment({ id: "cv-2", classProfile: "class-2", vocabulary: "voc-1" });

    const actual = margeProfileModels("merge", [
      first.build(),
      second.build(),
    ]);

    expect((actual.getEntities()["class-1"] as ProfileClass).controlledVocabularies)
      .toStrictEqual(["cv-1"]);
    expect((actual.getEntities()["class-2"] as ProfileClass).controlledVocabularies)
      .toStrictEqual(["cv-2"]);

  });

});
