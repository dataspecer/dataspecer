import { describe, test, expect } from "vitest";

import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";

import {
  createSemicShaclStylePolicy,
  createShaclForProfile,
  filterLanguageStringLiterals,
} from "./shacl.ts";

describe("createShaclForProfile", () => {

  const xsd = createDefaultSemanticModelBuilder({
    baseUrl: "http://www.w3.org/2001/XMLSchema#",
    baseIdentifier: "xsd:",
  });

  const xsdString = xsd.class({ iri: "string" });

  test("Implementation test I.", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseUrl: "http://example.com/vocabulary#",
      baseIdentifier: "vocab:",
    });

    const object = vocabulary.class({ iri: "object" });

    const human = vocabulary.class({ iri: "human" });

    const name = human.property({
      iri: "name",
      name: { "en": "name" },
      range: xsdString,
    });

    const has = human.property({
      iri: "has",
      name: { "en": "has" },
      range: object,
    });

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseUrl: "http://example.com/profile#",
      baseIdentifier: "profile:",
    });

    const objectProfile = profile.class({ iri: "object" })
      .reuseName(object);

    const humanProfile = profile.class({ iri: "human" })
      .reuseName(human);

    profile.property({ iri: "name" })
      .reuseName(name)
      .domain(humanProfile)
      .range(xsdString.absoluteIri());

    profile.property({ iri: "has" })
      .reuseName(has)
      .domain(humanProfile)
      .range(objectProfile);

    // Prepare SHACL

    const shacl = createShaclForProfile(
      [xsd.build(), vocabulary.build()], [],
      profile.build(),
      createSemicShaclStylePolicy("http://example/shacl.ttl"));

    //

    expect(shacl.members.length).toBe(2);

    expect(shacl.members[0]!.targetClass)
      .toStrictEqual("http://example.com/vocabulary#object");

    const humanShape = shacl.members[1]!;
    expect(humanShape.targetClass)
      .toStrictEqual("http://example.com/vocabulary#human");

    expect(humanShape.propertyShapes.length).toBe(2);

    const hasShape = humanShape.propertyShapes[0]!;
    expect(hasShape.seeAlso)
      .toStrictEqual("http://example.com/profile#name");
    expect(hasShape.datatype)
      .toStrictEqual("http://www.w3.org/2001/XMLSchema#string");
  });

  test("Issue #1298: Language filter", async () => {

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
      baseIdentifier: "profile:",
    });

    const humanProfile = profile.class({iri: "person"})
      .reuseName(person);

    profile.property({ iri: "name", usageNote: { cs: "Jméno osoby" } })
      .reuseName(name)
      .domain(humanProfile)
      .range(xsdString.absoluteIri());

    // Prepare default shacl with all languages.

    const shacl = createShaclForProfile(
      [xsd.build(), vocabulary.build()], [], profile.build(),
      createSemicShaclStylePolicy("http://example/shacl.ttl"));

    expect(shacl.members.length).toBe(1);
    expect(shacl.members[0].propertyShapes.length).toBe(1);
    expect(shacl.members[0].propertyShapes[0].name)
      .toStrictEqual({ en: "name", cs: "Jméno" });
    expect(shacl.members[0].propertyShapes[0].description)
      .toStrictEqual({ cs: "Jméno osoby" });

    // Keep only English values.
    filterLanguageStringLiterals(shacl, value => {
      const en = value["en"];
      if (en === undefined) {
        return {};
      } else {
        return { en } as Record<string, string>;
      }
    });

    expect(shacl.members.length).toBe(1);
    expect(shacl.members[0].propertyShapes.length).toBe(1);
    expect(shacl.members[0].propertyShapes[0].name)
      .toStrictEqual({ en: "name" });
    expect(shacl.members[0].propertyShapes[0].description)
      .toStrictEqual({});

  });

});
