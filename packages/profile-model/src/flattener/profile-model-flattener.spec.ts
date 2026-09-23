import { describe, test, expect } from "vitest";
import { createDefaultProfileModelBuilder } from "../index.ts";
import { flattenProfileModels } from "./profile-model-flattener.ts";

describe("flattenProfileModels", () => {

  test("Own controlled vocabulary assignment is passed through and stays resolvable.", () => {
    const builder = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/top#",
      baseIdentifier: "top:",
    });
    builder.class({ id: "class-1", controlledVocabularies: ["cv-1"] });
    builder.controlledVocabularyAssignment({ id: "cv-1", classProfile: "class-1", vocabulary: "voc-1" });
    const top = builder.build();

    const actual = flattenProfileModels("flat", [], top);

    expect(actual.getEntities()["class-1"]).toMatchObject({
      controlledVocabularies: ["cv-1"],
    });
    expect(actual.getEntities()["cv-1"]).toStrictEqual(top.getEntities()["cv-1"]);
  });

  test("Inherited controlled vocabulary assignment is dropped - not implemented.", () => {
    const dependencyBuilder = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/dependency#",
      baseIdentifier: "dependency:",
    });
    const ancestor = dependencyBuilder.class({
      id: "ancestor", controlledVocabularies: ["cv-ancestor"],
    });
    dependencyBuilder.controlledVocabularyAssignment({
      id: "cv-ancestor", classProfile: "ancestor", vocabulary: "voc-1", qualifier: "RECOMMENDED",
    });

    const topBuilder = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/top#",
      baseIdentifier: "top:",
    });
    topBuilder.class({ id: "class-1" }).profile(ancestor);

    const actual = flattenProfileModels(
      "flat", [dependencyBuilder.build()], topBuilder.build());

    // Not implemented: the inherited assignment is neither pulled onto
    // the flattened class profile's own controlledVocabularies list...
    expect(actual.getEntities()["class-1"]).toMatchObject({
      controlledVocabularies: [],
    });
    // ...nor materialized in the flattened output at all.
    expect(actual.getEntities()["cv-ancestor"]).toBeUndefined();
  });

});

describe("flattenProfileModels - existing behavior", () => {

  test("Implementation test I.", () => {

    const biology = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/first#",
      baseIdentifier: "first:"
    });

    const human = biology.class({
      iri: "Human",
      usageNote: { en: "Using human" },
    }).profile({ identifier: "vocabulary:human" });

    const age = biology.property({
      iri: "age",
    }).domain(human).range("xsd:short");

    const mankind = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/second#",
      baseIdentifier: "second:"
    });

    const person = mankind.class({
      iri: "Person",
      description: { en: "Good person."},
      name: { en: "Person" },
    }).profile(human);

    mankind.property({
      iri: "name",
    }).domain(person).range("xsd:string");

    const state = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/third#",
      baseIdentifier: "third:"
    });

    const citizen = state.class({
      iri: "Citizen",
      name: { en: "Citizen" },
      usageNote: { en: "Person becomes a citizen." },
    }).profile(person).reuseDescription(person);

    // We need to have range here, as range is not part of the profiling
    state.property().profile(age).domain(citizen).range("xsd:short");;

    // Actual

    const actual = flattenProfileModels(
      "flat", [biology.build(), mankind.build()], state.build());

    // Expected

    const expected = createDefaultProfileModelBuilder({
      baseIri: "http://example.com/third#",
      baseIdentifier: "third:"
    });

    const expectedCitizen = expected.class({
      iri: "Citizen",
      name: { en: "Citizen" },
      description: { en: "Good person."},
      usageNote: { en: "Person becomes a citizen." },
    }).profile({ identifier: "vocabulary:human" });

    // Here we do not set profile, as from the perspective of the profiles
    // we have resolved all the information.
    expected.property().domain(expectedCitizen).range("xsd:short");

    // Test

    expect(actual.getEntities()).toEqual(expected.build().getEntities());

  });

});
