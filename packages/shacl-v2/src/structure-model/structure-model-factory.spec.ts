import { describe, test } from "vitest";

import { createDataSpecificationVocabulary, RequirementLevel } from "@dataspecer/data-specification-vocabulary";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";

import { createStructureModelForProfile } from "./structure-model-factory.ts";
import { createStructureModelBuilder } from "./structure-model-builder.ts";

describe("createStructureModel", () => {

  const xsd = createDefaultSemanticModelBuilder({
    baseUrl: "http://www.w3.org/2001/XMLSchema#",
    baseIdentifier: "xsd:",
  });

  const xsdString = xsd.class({ iri: "string" });

  test("Default test.", () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseUrl: "http://example.com/vocabulary#",
      baseIdentifier: "vocab:",
    });

    const person = vocabulary.class({
      iri: "person",
      name: { "cs": "Osoba", "en": "Person" },
    });

    const name = person.property({
      iri: "name",
      name: { en: "name", cs: "Jméno" },
      description: { en: "Description" },
      range: xsdString,
    });

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseUrl: "http://example.com/profile#",
      baseIdentifier: "profile:"
    });

    const humanProfile = profile.class({
      iri: "person",
    }).reuseName(person);

    profile.property({
      iri: "name",
      usageNote: { cs: "Jméno osoby" },
      cardinality: [0, 1],
    }).reuseName(name)
      .domain(humanProfile)
      .range(xsdString.absoluteIri());

    profile.property({
      iri: "friend",
    }).domain(humanProfile).range(humanProfile);

    // OWL

    const owl = semanticModelToLightweightOwl(
      [], [xsd.build(), vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [xsd.build(), vocabulary.build()],
      profiles: [profile.build()],
    }, [profile.build()], { iri: "http://example.com/" });

    // Structure model

    const actual = createStructureModelForProfile(owl, dsv);

    // Expected

    const expected = createStructureModelBuilder();

    const structurePerson = expected.class(
      "http://example.com/profile#person", {
      name: { "cs": "Osoba", "en": "Person" },
      nameSource: "http://example.com/vocabulary#person",
      rdfTypes: ["http://example.com/vocabulary#person"],
    });

    structurePerson.attribute(
      "http://example.com/profile#name", {
      name: { "en": "name", "cs": "Jméno" },
      nameSource: "http://example.com/vocabulary#name",
      usageNote: { cs: "Jméno osoby" },
      rdfPredicates: ["http://example.com/vocabulary#name"],
      range: ["http://www.w3.org/2001/XMLSchema#string"],
      requirementLevel: RequirementLevel.undefined,
      rangeCardinality: { min: 0, max: 1 },
    });

    structurePerson.association(
      "http://example.com/profile#friend", {
      range: ["http://example.com/profile#person"],
      rdfPredicates: [],
    });

    // Test.

    assert.deepEqual(actual, expected.build());

  });

});
