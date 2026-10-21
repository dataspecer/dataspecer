import { beforeEach, describe, test, expect } from "vitest";

import {
  createDataSpecificationVocabulary,
  RequirementLevel,
} from "@dataspecer/data-specification-vocabulary/semantic-model";
import {
  createDefaultProfileModelBuilder,
  ProfileClassBuilder,
  ProfileModelBuilder,
} from "@dataspecer/profile-model";
import { createDefaultSemanticModelBuilder, SemanticModel } from "@dataspecer/semantic-model";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";
import {
  DEFAULT_CONTROLLED_VOCABULARY,
  ControlledVocabulary,
} from "@dataspecer/controlled-vocabulary-model";

import { createStructureModelForProfile } from "./structure-model-factory.ts";
import { createStructureModelBuilder } from "./structure-model-builder.ts";

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

});

describe("createStructureModel - controlled vocabularies", () => {

  // The vocabulary is not changed by the tests.
  const vocabulary = createDefaultSemanticModelBuilder({
    baseIdentifier: "vocab:",
    baseIri: "http://example.com/vocabulary#",
  });

  const person = vocabulary.class({ iri: "person" });

  // Each test adds its own assignment to the profile.
  let profileBuilder: ProfileModelBuilder;
  let personProfile: ProfileClassBuilder;

  beforeEach(() => {
    profileBuilder = createDefaultProfileModelBuilder({
      baseIdentifier: "profile:",
      baseIri: "http://example.com/profile#",
    });
    personProfile = profileBuilder.class({
      iri: "person",
      controlledVocabularies: ["assignment-1"],
    }).profile(person);
  });

  test("Resolves the pattern and scheme of a SKOS-based controlled vocabulary.", () => {

    // Controlled vocabulary

    const controlledVocabulary = {
      ...DEFAULT_CONTROLLED_VOCABULARY,
      id: "cv-1",
      iri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
      references: "http://example.com/scheme",
      conformsToSkos: true,
    };
    const controlledVocabularies = entityModel("http://example.com/cv#", [controlledVocabulary]);

    // Profile

    profileBuilder.controlledVocabularyAssignment({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    });
    const profile = profileBuilder.build();

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [vocabulary.build()],
      profiles: [profile],
      controlledVocabularies: [controlledVocabularies],
    }, [profile], { iri: "http://example.com/" });

    // Structure model

    const owl = semanticModelToLightweightOwl(
      [], [vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    const actual = createStructureModelForProfile(owl, dsv, [controlledVocabulary]);

    expect(actual.classes).toHaveLength(1);
    expect(actual.classes[0]!.controlledVocabularyAssignments).toStrictEqual([{
      iri: "http://example.com/assignments/1",
      controlledVocabularyIri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
      schemeIri: "http://example.com/scheme",
      usageExpectation: "must",
      replaces: null,
    }]);

  });

  test("Does not resolve a scheme of a vocabulary that is not SKOS-based.", () => {

    // Controlled vocabulary

    const controlledVocabulary = {
      ...DEFAULT_CONTROLLED_VOCABULARY,
      id: "cv-1",
      iri: "http://example.com/vocabularies/cv-1",
      pattern: "^http://example\\.com/codes/.*$",
      references: "http://example.com/download",
      conformsToSkos: false,
    };
    const controlledVocabularies = entityModel("http://example.com/cv#", [controlledVocabulary]);

    // Profile

    profileBuilder.controlledVocabularyAssignment({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    });
    const profile = profileBuilder.build();

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [vocabulary.build()],
      profiles: [profile],
      controlledVocabularies: [controlledVocabularies],
    }, [profile], { iri: "http://example.com/" });

    // Structure model

    const owl = semanticModelToLightweightOwl(
      [], [vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    const actual = createStructureModelForProfile(owl, dsv, [controlledVocabulary]);

    expect(actual.classes).toHaveLength(1);
    const assignments = actual.classes[0]!.controlledVocabularyAssignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.pattern).toBe("^http://example\\.com/codes/.*$");
    expect(assignments[0]!.schemeIri).toBeNull();

  });

  test("Resolves a vocabulary without a pattern or reference as missing.", () => {

    // Controlled vocabulary

    const controlledVocabulary = {
      ...DEFAULT_CONTROLLED_VOCABULARY,
      id: "cv-1",
      iri: "http://example.com/vocabularies/cv-1",
      pattern: null,
      references: "",
      conformsToSkos: true,
    };
    const controlledVocabularies = entityModel("http://example.com/cv#", [controlledVocabulary]);

    // Profile

    profileBuilder.controlledVocabularyAssignment({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    });
    const profile = profileBuilder.build();

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [vocabulary.build()],
      profiles: [profile],
      controlledVocabularies: [controlledVocabularies],
    }, [profile], { iri: "http://example.com/" });

    // Structure model

    const owl = semanticModelToLightweightOwl(
      [], [vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    const actual = createStructureModelForProfile(owl, dsv, [controlledVocabulary]);

    expect(actual.classes).toHaveLength(1);
    const assignments = actual.classes[0]!.controlledVocabularyAssignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.pattern).toBeNull();
    expect(assignments[0]!.schemeIri).toBeNull();

  });

  test("Resolves nothing for a controlled vocabulary that is not available.", () => {

    // Controlled vocabulary

    // The assignment below points to a vocabulary "cv-1" that is not
    // part of any model.
    const controlledVocabularies = entityModel("http://example.com/cv#", []);

    // Profile

    profileBuilder.controlledVocabularyAssignment({
      id: "assignment-1",
      iri: "http://example.com/assignments/1",
      classProfile: personProfile.identifier,
      vocabulary: "cv-1",
      qualifier: "must",
    });
    const profile = profileBuilder.build();

    // DSV

    const dsv = createDataSpecificationVocabulary({
      semantics: [vocabulary.build()],
      profiles: [profile],
      controlledVocabularies: [controlledVocabularies],
    }, [profile], { iri: "http://example.com/" });

    // Structure model

    const owl = semanticModelToLightweightOwl(
      [], [vocabulary.build()], { baseIri: "", idDefinedBy: "" });

    const actual = createStructureModelForProfile(owl, dsv, []);

    expect(actual.classes).toHaveLength(1);
    const assignments = actual.classes[0]!.controlledVocabularyAssignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.pattern).toBeNull();
    expect(assignments[0]!.schemeIri).toBeNull();

  });

});

/**
 * A minimal semantic-model-shaped container for controlled vocabularies,
 * which have no dedicated model builder.
 */
function entityModel(
  baseIri: string, entities: ControlledVocabulary[],
): SemanticModel {
  const record: Record<string, ControlledVocabulary> = {};
  entities.forEach(entity => { record[entity.id] = entity; });
  return {
    getId: () => baseIri,
    getBaseIri: () => baseIri,
    getEntities: () => record,
  } as SemanticModel;
}
