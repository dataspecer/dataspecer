import { describe, test, expect } from "vitest";

import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";

import {
  createSemicShaclStylePolicy,
  createShaclForProfile,
  filterLanguageStringLiterals,
} from "./shacl.ts";
import { shaclToRdf } from "./shacl-to-rdf.ts";

describe("createShaclForProfile", () => {

  const xsd = createDefaultSemanticModelBuilder({
    baseIdentifier: "xsd:",
    baseIri: "http://www.w3.org/2001/XMLSchema#",
  });

  const xsdString = xsd.class({ iri: "string" });

  const rdfs = createDefaultSemanticModelBuilder({
    baseIdentifier: "rdfs:",
    baseIri: "http://www.w3.org/2000/01/rdf-schema#",
  });

  const rdfsLiteral = rdfs.class({ iri: "Literal" });

  const rdfsResource = rdfs.class({ iri: "Resource" });

  test("Implementation test I.", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
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
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const objectProfile = profile.class({ iri: "object" })
      .reuseName(object);

    const personProfile = profile.class({ iri: "human" })
      .reuseName(human);

    profile.property({ iri: "name" })
      .reuseName(name)
      .domain(personProfile)
      .range(xsdString.absoluteIri());

    profile.property({ iri: "has" })
      .reuseName(has)
      .domain(personProfile)
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

  // Language filter
  test("https://github.com/dataspecer/dataspecer/issues/1298", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
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
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profile.class({ iri: "person" })
      .reuseName(person);

    profile.property({ iri: "name", usageNote: { cs: "Jméno osoby" } })
      .reuseName(name)
      .domain(personProfile)
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

  // Deduplication
  test("https://github.com/dataspecer/dataspecer/issues/1294", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
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
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profile.class({ iri: "person" })
      .reuseName(person);

    profile.property({ iri: "name", usageNote: { cs: "Jméno osoby" } })
      .reuseName(name)
      .domain(personProfile)
      .range(xsdString.absoluteIri());

    const otherPersonProfile = profile.class({ iri: "otherPerson" })
      .reuseName(person);

    profile.property({ iri: "name", usageNote: { cs: "Jméno osoby" } })
      .reuseName(name)
      .domain(otherPersonProfile)
      .range(xsdString.absoluteIri());

    // Prepare default shacl with all languages.

    const shacl = createShaclForProfile(
      [xsd.build(), vocabulary.build()], [], profile.build(),
      createSemicShaclStylePolicy("http://example/shacl.ttl/"));

    // Convert to RDF

    const rdf = await shaclToRdf(shacl, {});
    const count = (rdf.match(/Jméno osoby/g) || []).length;
    expect(count).toBe(1);

  });

  // Do not check for rdfs:Literal and rdfs:Resource types.
  test("https://github.com/dataspecer/dataspecer/issues/1295", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "person" });

    const hasLiteral = vocabulary.property({ iri: "hasLiteral" })
      .domain(person)
      .range(rdfsLiteral);

    const hasResource = vocabulary.property({ iri: "hasResource" })
      .domain(person)
      .range(rdfsResource);

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profile.class({iri: "person"});
    personProfile.profile(person);

    profile.property({ iri: "hasLiteral" })
      .profile(hasLiteral)
      .domain(personProfile)
      .range(rdfsLiteral.absoluteIri());

    profile.property({ iri: "hasResource" })
      .profile(hasResource)
      .domain(personProfile)
      .range(rdfsResource.absoluteIri());

    // Prepare default shacl with all languages.

    const shacl = createShaclForProfile(
      [xsd.build(), rdfs.build(), vocabulary.build()], [], profile.build(),
      createSemicShaclStylePolicy("http://example/shacl.ttl/"));

    //

    expect(shacl.members.length).toBe(1);
    const personShape = shacl.members[0];

    expect(personShape.propertyShapes.length).toBe(2);
    const types = personShape.propertyShapes
      .map(item => item.class ?? item.datatype)
      .filter(item => item !== null);

    // There should be no types as
    // rdfs:Literal and rdfs:Resource should be filtered out.
    expect(types.length).toBe(0);
  });


});
