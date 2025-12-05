import { describe, test, expect } from "vitest";
import { createDefaultProfileModelBuilder } from "../index.ts";
import { flattenProfileModels } from "./profile-model-flattener.ts";

describe("flattenProfileModels", () => {

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
