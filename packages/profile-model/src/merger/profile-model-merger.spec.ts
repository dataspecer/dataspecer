import { describe, test, expect } from "vitest";
import { createDefaultProfileModelBuilder } from "../default-profile-model-builder.ts";
import { margeProfileModels } from "./profile-model-merger.ts";

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

});
