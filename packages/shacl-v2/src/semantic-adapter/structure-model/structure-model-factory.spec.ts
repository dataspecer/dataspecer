import { describe, test, expect } from "vitest";

import { createDataSpecificationVocabulary, RequirementLevel } from "@dataspecer/data-specification-vocabulary/semantic-model";
import { createDefaultProfileModelBuilder, ProfileModel } from "@dataspecer/profile-model";
import { createDefaultSemanticModelBuilder, SemanticModel } from "@dataspecer/semantic-model";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";
import {
  CONTROLLED_VOCABULARY_TYPE,
  ControlledVocabulary,
} from "@dataspecer/controlled-vocabulary-model";
import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  ControlledVocabularyAssignment,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity } from "@dataspecer/core-v2/entity-model";

import { createStructureModelForProfile } from "./structure-model-factory.ts";
import { createStructureModelBuilder } from "./structure-model-builder.ts";

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

function controlledVocabularyFixture(
  overrides: Partial<ControlledVocabulary>,
): ControlledVocabulary {
  return {
    id: "cv", type: [CONTROLLED_VOCABULARY_TYPE],
    title: "", pattern: "", references: "", conformsToSkos: true, documentation: "",
    distribution: { downloadUrl: "", accessUrl: "" },
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

describe("createStructureModel", () => {

  const xsd = createDefaultSemanticModelBuilder({
    baseIdentifier: "xsd:",
    baseIri: "http://www.w3.org/2001/XMLSchema#",
  });

  const xsdString = xsd.class({ iri: "string" });

  test("Default test.", () => {

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

  test("Resolves a controlled vocabulary assignment's pattern.", () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocab:",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({ iri: "person" });

    // Controlled vocabulary

    const controlledVocabulary = controlledVocabularyFixture({
      id: "cv-1",
      iri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
    });
    const controlledVocabularies = entityModel(
      "http://example.com/cv#", [controlledVocabulary]);

    // Profile

    const profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });

    profileBuilder.class({
      iri: "person",
      controlledVocabularies: ["assignment-1"],
    }).profile(person);

    const profile: ProfileModel = withExtraEntities(profileBuilder.build(), [assignmentFixture({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: "profile:001",
      vocabulary: "cv-1",
      qualifier: "must",
    })]);

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [xsd.build(), vocabulary.build()],
      profiles: [profile],
      controlledVocabularies: [controlledVocabularies],
    }, [profile], { iri: "http://example.com/" });

    // Structure model

    const owl = semanticModelToLightweightOwl(
      [], [xsd.build(), vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    const actual = createStructureModelForProfile(owl, dsv, [{
      baseIri: controlledVocabularies.getBaseIri(),
      entities: Object.values(controlledVocabularies.getEntities()),
    }]);

    // Test.

    expect(actual.classes.length).toBe(1);
    expect(actual.classes[0]!.controlledVocabularyAssignments).toStrictEqual([{
      iri: "http://example.com/assignments/1",
      controlledVocabularyIri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
      usageExpectation: "must",
      replaces: null,
    }]);

  });

});
