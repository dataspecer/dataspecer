import { describe, test, expect } from "vitest";

import { createDefaultSemanticModelBuilder, SemanticModel } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder, ProfileModel } from "@dataspecer/profile-model";
import {
  CONTROLLED_VOCABULARY_TYPE,
  ControlledVocabulary,
} from "@dataspecer/controlled-vocabulary-model";
import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  ControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity } from "@dataspecer/core-v2/entity-model";

import { semanticModelsToShacl } from "./shacl-semantic-adapter.ts";
import { shaclToRdf } from "../shacl-to-rdf.ts";
import { ShaclSeverity } from "../shacl-model.ts";

/**
 * Adds extra entities to a built model - used to attach a standalone
 * ControlledVocabularyAssignment/ControlledVocabulary, which the
 * fluent builders have no dedicated method for. Wraps each accessor
 * explicitly rather than spreading `model` - it is a class instance,
 * so its methods live on the prototype and a spread would drop them.
 */
function withExtraEntities(
  model: ProfileModel, entities: Entity[],
): ProfileModel {
  const extra: Record<string, Entity> = {};
  entities.forEach(entity => { extra[entity.id] = entity; });
  return {
    getId: () => model.getId(),
    getBaseIri: () => model.getBaseIri(),
    getEntities: () => ({ ...model.getEntities(), ...extra }),
  };
}

/**
 * A minimal semantic-model-shaped container for standalone entities,
 * such as a ControlledVocabulary, that have no dedicated builder.
 */
function entityModel(baseIri: string, entities: Entity[]): SemanticModel {
  const record: Record<string, Entity> = {};
  entities.forEach(entity => { record[entity.id] = entity; });
  return {
    getId: () => baseIri,
    getBaseIri: () => baseIri,
    getEntities: () => record,
  } as SemanticModel;
}

function controlledVocabularyFixture(
  overrides: Partial<ControlledVocabulary>,
): ControlledVocabulary {
  return {
    id: "cv", type: [CONTROLLED_VOCABULARY_TYPE],
    title: "", pattern: null, references: "", conformsToSkos: true, documentation: null,
    distribution: { downloadUrl: null, accessUrl: "" },
    iri: null,
    ...overrides,
  };
}

function assignmentFixture(
  overrides: Partial<ControlledVocabularyAssignment>,
): ControlledVocabularyAssignment {
  return {
    id: "cv-assignment", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "", vocabulary: "", qualifier: "must",
    replaces: null, iri: null,
    ...overrides,
  };
}

describe("semanticModelsToShacl", () => {

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

    const shacl = semanticModelsToShacl(
      [xsd.build(), vocabulary.build()],
      [profile.build()],
      profile.build(),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });

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

    const shacl = semanticModelsToShacl(
      [xsd.build(), vocabulary.build()],
      [profile.build()],
      profile.build(),
      {
        policy: "semic-v1",
        languages: ["en"],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });

    expect(shacl.members.length).toBe(1);
    expect(shacl.members[0].propertyShapes.length).toBe(1);
    expect(shacl.members[0].propertyShapes[0].name)
      .toStrictEqual({ en: "name" });
    expect(shacl.members[0].propertyShapes[0].description).toBeNull();

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

    const shacl = semanticModelsToShacl(
      [xsd.build(), vocabulary.build()],
      [profile.build()],
      profile.build(),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });


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

    const personProfile = profile.class({ iri: "person" });
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

    const shacl = semanticModelsToShacl(
      [xsd.build(), rdfs.build(), vocabulary.build()],
      [profile.build()],
      profile.build(),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });


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

  // Profile of a Profile of a Class..
  test("https://github.com/dataspecer/dataspecer/issues/1377", async () => {

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const object = vocabulary.class({ iri: "object" });

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const objectProfile = profile.class({
      iri: "object",
      description: { "en": "Profile" },
    }).reuseName(object);

    // Profile of Profile

    const profileOfProfile = createDefaultProfileModelBuilder({
      baseIdentifier: "profileOfProfile:",
      baseIri: "http://example.com/profileOfProfile#",
    });

    profileOfProfile.class({
      iri: "object",
      description: { "en": "Profile of profile" },
    }).reuseName(objectProfile);

    // Prepare SHACL

    const shacl = semanticModelsToShacl(
      [xsd.build(), vocabulary.build()],
      [profile.build(), profileOfProfile.build()],
      profileOfProfile.build(),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });

    // This should produce only one SHACL shape.
    expect(shacl.members.length).toBe(1);

  });

  // sgov:text should map to rdf:langString.
  test("https://github.com/dataspecer/dataspecer/issues/1375", () => {
    //

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "Person" });

    const name = vocabulary.property({ iri: "name" })
      .domain(person);

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profile.class({}).profile(person);

    profile.property({})
      .profile(name)
      .domain(personProfile)
      .range("https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text");

    //

    const shacl = semanticModelsToShacl(
      [xsd.build(), vocabulary.build()],
      [profile.build()],
      profile.build(),
      {
        policy: "semic-v1",
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints: false,
      },
      { baseIri: "http://example/shacl.ttl" });


    //

    const actualType = shacl.members[0].propertyShapes[0].datatype;

    expect(actualType)
      .toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString");

  });

});

describe("semanticModelsToShacl - controlled vocabularies", () => {

  const configuration = {
    policy: "semic-v1" as const,
    languages: [],
    noClassConstraints: false,
    splitPropertyShapesByConstraints: false,
  };

  test("must severity, single controlled vocabulary.", async () => {

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "person" });

    const controlledVocabulary = controlledVocabularyFixture({
      id: "cv-1",
      iri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
    });
    const controlledVocabularies = entityModel(
      "http://example.com/cv#", [controlledVocabulary]);

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profileBuilder.class({
      iri: "person",
      controlledVocabularies: ["assignment-1"],
    }).profile(person);

    const profile = withExtraEntities(profileBuilder.build(), [assignmentFixture({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    })]);

    const shacl = semanticModelsToShacl(
      [vocabulary.build()],
      [profile],
      profile,
      configuration,
      { baseIri: "http://example/shacl.ttl" },
      [controlledVocabularies]);

    // The primary shape and the controlled vocabulary shape, sharing
    // the same targetClass.
    expect(shacl.members.length).toBe(2);

    const primaryShape = shacl.members.find(item => item.pattern === null);
    const cvShape = shacl.members.find(item => item.pattern !== null);

    expect(primaryShape).toBeDefined();
    expect(cvShape).toBeDefined();
    expect(cvShape!.targetClass).toBe("http://example.com/vocabulary#person");
    expect(cvShape!.targetClass).toBe(primaryShape!.targetClass);
    expect(cvShape!.propertyShapes).toStrictEqual([]);
    expect(cvShape!.pattern).toBe("^http://example\\.com/codes/.*$");
    expect(cvShape!.severity).toBe(ShaclSeverity.Violation);

    const rdf = await shaclToRdf(shacl, {});
    expect(rdf).toContain("sh:pattern");
    expect(rdf).toContain("sh:severity sh:Violation");

  });

  test("at-least-one and recommended both map to Warning, as independent shapes (not combined via sh:or).", async () => {

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "person" });

    const controlledVocabularies = entityModel("http://example.com/cv#", [
      controlledVocabularyFixture({
        id: "cv-a",
        iri: "http://example.com/vocabularies/cv-a",
        pattern: "^http://example\\.com/a/.*$",
      }),
      controlledVocabularyFixture({
        id: "cv-b",
        iri: "http://example.com/vocabularies/cv-b",
        pattern: "^http://example\\.com/b/.*$",
      }),
    ]);

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profileBuilder.class({
      iri: "person",
      controlledVocabularies: ["assignment-a", "assignment-b"],
    }).profile(person);

    const profile = withExtraEntities(profileBuilder.build(), [
      assignmentFixture({
        id: "assignment-a",
        iri: "http://example.com/assignments/a",
        classProfile: personProfile.identifier,
        vocabulary: "cv-a",
        qualifier: "at-least-one",
      }),
      assignmentFixture({
        id: "assignment-b",
        iri: "http://example.com/assignments/b",
        classProfile: personProfile.identifier,
        vocabulary: "cv-b",
        qualifier: "recommended",
      }),
    ]);

    const shacl = semanticModelsToShacl(
      [vocabulary.build()],
      [profile],
      profile,
      configuration,
      { baseIri: "http://example/shacl.ttl" },
      [controlledVocabularies]);

    // Primary shape + one independent shape per controlled vocabulary.
    expect(shacl.members.length).toBe(3);

    const cvShapes = shacl.members.filter(item => item.pattern !== null);
    expect(cvShapes.length).toBe(2);
    expect(cvShapes.every(shape => shape.severity === ShaclSeverity.Warning))
      .toBe(true);

    const patterns = cvShapes.map(shape => shape.pattern).sort();
    expect(patterns).toStrictEqual([
      "^http://example\\.com/a/.*$",
      "^http://example\\.com/b/.*$",
    ]);

    // Distinct IRIs - two separate, independently reported shapes.
    expect(new Set(cvShapes.map(shape => shape.iri)).size).toBe(2);

    const rdf = await shaclToRdf(shacl, {});
    const patternCount = (rdf.match(/sh:pattern/g) ?? []).length;
    expect(patternCount).toBe(2);
    expect(rdf).not.toContain("sh:or");

  });

  test("Inherits a controlled vocabulary shape from an ancestor class.", async () => {

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const baseClass = vocabulary.class({ iri: "base" });
    const derivedClass = vocabulary.class({ iri: "derived" });

    const controlledVocabularies = entityModel("http://example.com/cv#", [
      controlledVocabularyFixture({
        id: "cv-1",
        iri: "http://example.com/vocabularies/cv-1",
        pattern: "^http://example\\.com/codes/.*$",
      }),
    ]);

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const baseProfile = profileBuilder.class({
      iri: "base",
      controlledVocabularies: ["assignment-1"],
    }).profile(baseClass);

    const derivedProfile = profileBuilder.class({ iri: "derived" })
      .profile(derivedClass);

    profileBuilder.generalization(baseProfile, derivedProfile);

    const profile = withExtraEntities(profileBuilder.build(), [assignmentFixture({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: baseProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    })]);

    const shacl = semanticModelsToShacl(
      [vocabulary.build()],
      [profile],
      profile,
      configuration,
      { baseIri: "http://example/shacl.ttl" },
      [controlledVocabularies]);

    const derivedCvShape = shacl.members.find(item =>
      item.targetClass === "http://example.com/vocabulary#derived"
      && item.pattern !== null);

    expect(derivedCvShape).toBeDefined();
    expect(derivedCvShape!.pattern).toBe("^http://example\\.com/codes/.*$");
    expect(derivedCvShape!.severity).toBe(ShaclSeverity.Violation);

    // Base keeps its own shape too.
    const baseCvShape = shacl.members.find(item =>
      item.targetClass === "http://example.com/vocabulary#base"
      && item.pattern !== null);
    expect(baseCvShape).toBeDefined();

  });

  test("An override with 'replaces' takes precedence over the inherited assignment.", async () => {

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const baseClass = vocabulary.class({ iri: "base" });
    const derivedClass = vocabulary.class({ iri: "derived" });

    const controlledVocabularies = entityModel("http://example.com/cv#", [
      controlledVocabularyFixture({
        id: "cv-base",
        iri: "http://example.com/vocabularies/cv-base",
        pattern: "^http://example\\.com/base/.*$",
      }),
      controlledVocabularyFixture({
        id: "cv-override",
        iri: "http://example.com/vocabularies/cv-override",
        pattern: "^http://example\\.com/override/.*$",
      }),
    ]);

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const baseProfile = profileBuilder.class({
      iri: "base",
      controlledVocabularies: ["assignment-base"],
    }).profile(baseClass);

    const derivedProfile = profileBuilder.class({
      iri: "derived",
      controlledVocabularies: ["assignment-override"],
    }).profile(derivedClass);

    profileBuilder.generalization(baseProfile, derivedProfile);

    const profile = withExtraEntities(profileBuilder.build(), [
      assignmentFixture({
        id: "assignment-base",
        iri: "http://example.com/assignments/base",
        classProfile: baseProfile.identifier,
        vocabulary: "cv-base",
        qualifier: "must",
      }),
      assignmentFixture({
        id: "assignment-override",
        iri: "http://example.com/assignments/override",
        classProfile: derivedProfile.identifier,
        vocabulary: "cv-override",
        qualifier: "must",
        replaces: { kind: "local", target: "assignment-base" },
      }),
    ]);

    const shacl = semanticModelsToShacl(
      [vocabulary.build()],
      [profile],
      profile,
      configuration,
      { baseIri: "http://example/shacl.ttl" },
      [controlledVocabularies]);

    const derivedCvShapes = shacl.members.filter(item =>
      item.targetClass === "http://example.com/vocabulary#derived"
      && item.pattern !== null);

    expect(derivedCvShapes.length).toBe(1);
    expect(derivedCvShapes[0]!.pattern).toBe("^http://example\\.com/override/.*$");

    // Base keeps its own, un-overridden shape.
    const baseCvShapes = shacl.members.filter(item =>
      item.targetClass === "http://example.com/vocabulary#base"
      && item.pattern !== null);

    expect(baseCvShapes.length).toBe(1);
    expect(baseCvShapes[0]!.pattern).toBe("^http://example\\.com/base/.*$");

  });

});

describe("semanticModelsToShacl - controlled vocabulary concept schemes", () => {

  const SKOS_IN_SCHEME = "http://www.w3.org/2004/02/skos/core#inScheme";

  /**
   * Generates SHACL for a class `person` with a single assignment of
   * a controlled vocabulary with given properties.
   */
  function generate(
    vocabularyOverrides: Partial<ControlledVocabulary>,
    qualifier: ControlledVocabularyAssignment["qualifier"],
    splitPropertyShapesByConstraints: boolean = false,
  ) {
    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "person" });

    const controlledVocabularies = entityModel("http://example.com/cv#", [
      controlledVocabularyFixture({
        id: "cv-1",
        iri: "http://example.com/vocabularies/cv-1",
        ...vocabularyOverrides,
      }),
    ]);

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    const personProfile = profileBuilder.class({
      iri: "person",
      controlledVocabularies: ["assignment-1"],
    }).profile(person);

    const profile = withExtraEntities(profileBuilder.build(), [assignmentFixture({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier,
    })]);

    return semanticModelsToShacl(
      [vocabulary.build()],
      [profile],
      profile,
      {
        policy: "semic-v1" as const,
        languages: [],
        noClassConstraints: false,
        splitPropertyShapesByConstraints,
      },
      { baseIri: "http://example/shacl.ttl" },
      [controlledVocabularies]);
  }

  /**
   * @returns Shapes other than the primary shape of the class.
   */
  function controlledVocabularyShapes(shacl: ReturnType<typeof generate>) {
    return shacl.members.filter(item => item.iri.includes("/cv-"));
  }

  test("A SKOS-based vocabulary with a pattern checks both the pattern and the scheme.", async () => {

    const shacl = generate({
      pattern: "^http://example\\.com/codes/.*$",
      references: "http://example.com/scheme",
      conformsToSkos: true,
    }, "must");

    // The primary shape and a single shape for the vocabulary.
    expect(shacl.members.length).toBe(2);
    const shapes = controlledVocabularyShapes(shacl);
    expect(shapes.length).toBe(1);
    const shape = shapes[0]!;

    expect(shape.targetClass).toBe("http://example.com/vocabulary#person");
    expect(shape.pattern).toBe("^http://example\\.com/codes/.*$");
    expect(shape.severity).toBe(ShaclSeverity.Violation);
    expect(shape.propertyShapes.length).toBe(1);
    const propertyShape = shape.propertyShapes[0]!;
    expect(propertyShape.path).toBe(SKOS_IN_SCHEME);
    expect(propertyShape.hasValue).toBe("http://example.com/scheme");
    // Severity of the shape does not apply to its property shapes.
    expect(propertyShape.severity).toBe(ShaclSeverity.Violation);

    const rdf = await shaclToRdf(shacl, {});
    expect(rdf).toContain("sh:pattern");
    expect(rdf).toContain("sh:path skos:inScheme");
    expect(rdf).toContain("sh:hasValue <http://example.com/scheme>");
    // The shape and its property shape.
    expect(rdf.match(/sh:severity sh:Violation/g)).toHaveLength(2);

  });

  test("A SKOS-based vocabulary without a pattern checks only the scheme, reported as a warning.", async () => {

    const shacl = generate({
      pattern: null,
      references: "http://example.com/scheme",
      conformsToSkos: true,
    }, "recommended");

    const shapes = controlledVocabularyShapes(shacl);
    expect(shapes.length).toBe(1);
    const shape = shapes[0]!;

    expect(shape.pattern).toBeNull();
    expect(shape.severity).toBe(ShaclSeverity.Warning);
    expect(shape.propertyShapes.length).toBe(1);
    expect(shape.propertyShapes[0]!.hasValue)
      .toBe("http://example.com/scheme");
    expect(shape.propertyShapes[0]!.severity).toBe(ShaclSeverity.Warning);

    const rdf = await shaclToRdf(shacl, {});
    expect(rdf).not.toContain("sh:pattern");
    expect(rdf).toContain("sh:hasValue <http://example.com/scheme>");
    expect(rdf).not.toContain("sh:Violation");
    expect(rdf.match(/sh:severity sh:Warning/g)).toHaveLength(2);

  });

  test("A vocabulary that is not SKOS-based checks only the pattern.", async () => {

    const shacl = generate({
      pattern: "^https://www\\.iana\\.org/assignments/media-types/.*$",
      references: "https://www.iana.org/assignments/media-types/media-types.xml",
      conformsToSkos: false,
    }, "must");

    const shapes = controlledVocabularyShapes(shacl);
    expect(shapes.length).toBe(1);
    expect(shapes[0]!.pattern)
      .toBe("^https://www\\.iana\\.org/assignments/media-types/.*$");
    expect(shapes[0]!.propertyShapes).toStrictEqual([]);

    const rdf = await shaclToRdf(shacl, {});
    expect(rdf).toContain("sh:pattern");
    expect(rdf).not.toContain("skos:inScheme");
    expect(rdf).not.toContain("sh:hasValue");

  });

  test("There is no shape when there is nothing to check.", () => {

    // SKOS-based without a pattern and without a scheme.
    const withoutScheme = generate({
      pattern: null,
      references: "",
      conformsToSkos: true,
    }, "must");
    expect(controlledVocabularyShapes(withoutScheme)).toStrictEqual([]);
    expect(withoutScheme.members.length).toBe(1);

    // Not SKOS-based and without a pattern, the reference is not a scheme.
    const withoutPattern = generate({
      pattern: null,
      references: "https://example.com/vocabulary.rdf",
      conformsToSkos: false,
    }, "must");
    expect(controlledVocabularyShapes(withoutPattern)).toStrictEqual([]);
    expect(withoutPattern.members.length).toBe(1);

  });

  test("The scheme check is a separate property shape when constraints are split.", async () => {

    const shacl = generate({
      pattern: "^http://example\\.com/codes/.*$",
      references: "http://example.com/scheme",
      conformsToSkos: true,
    }, "at-least-one", true);

    const shape = controlledVocabularyShapes(shacl)[0]!;
    expect(shape.propertyShapes.length).toBe(1);
    expect(shape.propertyShapes[0]!.iri.endsWith("/inScheme/hasValue"))
      .toBe(true);
    expect(shape.propertyShapes[0]!.hasValue)
      .toBe("http://example.com/scheme");
    expect(shape.propertyShapes[0]!.severity).toBe(ShaclSeverity.Warning);

    const rdf = await shaclToRdf(shacl, {});
    expect(rdf).toContain("sh:hasValue <http://example.com/scheme>");

  });

});
