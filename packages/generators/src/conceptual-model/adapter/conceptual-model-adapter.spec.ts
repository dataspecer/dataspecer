import { describe, expect, it } from "vitest";
import type { Entity } from "@dataspecer/core/entity-model";
import { CONTROLLED_VOCABULARY_ASSIGNMENT } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CONTROLLED_VOCABULARY_TYPE } from "@dataspecer/controlled-vocabulary-model";
import { semanticModelToConceptualModel } from "./conceptual-model-adapter.ts";

/**
 * Aggregated class profile as the adapter receives it.
 */
function classProfile(id: string, controlledVocabularies: string[]): Entity {
  return {
    id,
    type: ["class", "class-profile", "aggregate"],
    name: {},
    description: {},
    conceptIris: [],
    controlledVocabularies,
  } as unknown as Entity;
}

function assignment(id: string, vocabulary: string, qualifier: string): Entity {
  return {
    id,
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "profile",
    vocabulary,
    qualifier,
    replaces: null,
    iri: null,
  } as unknown as Entity;
}

function vocabulary(id: string, pattern: string | null): Entity {
  return {
    id,
    type: [CONTROLLED_VOCABULARY_TYPE],
    title: { en: id },
    pattern,
    references: `http://example.com/${id}`,
    conformsToSkos: true,
    documentation: null,
    distribution: { downloadUrl: null, accessUrl: "" },
    iri: null,
  } as unknown as Entity;
}

function controlledVocabulariesOf(entities: Entity[]) {
  return semanticModelToConceptualModel(entities, "model")!.classes["profile"].controlledVocabularies;
}

describe("semanticModelToConceptualModel, controlled vocabularies", () => {

  it("Resolves the assignment and its vocabulary to plain data.", () => {
    expect(controlledVocabulariesOf([
      classProfile("profile", ["assignment"]),
      assignment("assignment", "vocabulary", "must"),
      vocabulary("vocabulary", "^http://example\\.com/[a-z]+$"),
    ])).toStrictEqual([{
      id: "assignment",
      qualifier: "must",
      vocabulary: {
        id: "vocabulary",
        iri: null,
        title: { en: "vocabulary" },
        pattern: "^http://example\\.com/[a-z]+$",
        references: "http://example.com/vocabulary",
        conformsToSkos: true,
      },
    }]);
  });

  it("Keeps the order of the class profile and resolves each assignment.", () => {
    const result = controlledVocabulariesOf([
      classProfile("profile", ["second", "first"]),
      assignment("first", "vocabulary-a", "may"),
      assignment("second", "vocabulary-b", "at-least-one"),
      vocabulary("vocabulary-a", null),
      vocabulary("vocabulary-b", "^b$"),
    ]);
    expect(result.map(item => [item.id, item.qualifier, item.vocabulary.pattern]))
      .toStrictEqual([["second", "at-least-one", "^b$"], ["first", "may", null]]);
  });

  it("Resolves a legacy uppercase qualifier.", () => {
    const result = controlledVocabulariesOf([
      classProfile("profile", ["assignment"]),
      assignment("assignment", "vocabulary", "AT_LEAST_1"),
      vocabulary("vocabulary", "^a$"),
    ]);
    expect(result.map(item => item.qualifier)).toStrictEqual(["at-least-one"]);
  });

  it("Skips an assignment that is not in the model.", () => {
    expect(controlledVocabulariesOf([
      classProfile("profile", ["missing"]),
    ])).toStrictEqual([]);
  });

  it("Skips an assignment whose vocabulary is not in the model.", () => {
    expect(controlledVocabulariesOf([
      classProfile("profile", ["assignment"]),
      assignment("assignment", "missing", "must"),
    ])).toStrictEqual([]);
  });

  it("Skips an assignment whose vocabulary identifier belongs to another kind of entity.", () => {
    expect(controlledVocabulariesOf([
      classProfile("profile", ["assignment"]),
      assignment("assignment", "other", "must"),
      { id: "other", type: ["other"] } as Entity,
    ])).toStrictEqual([]);
  });

  it("Skips an assignment with an unknown qualifier.", () => {
    expect(controlledVocabulariesOf([
      classProfile("profile", ["assignment"]),
      assignment("assignment", "vocabulary", "sometimes"),
      vocabulary("vocabulary", "^a$"),
    ])).toStrictEqual([]);
  });

  it("Has no controlled vocabularies for a class profile without any.", () => {
    expect(controlledVocabulariesOf([classProfile("profile", [])])).toStrictEqual([]);
  });

  it("Has no controlled vocabularies for a class without the list.", () => {
    const entity = classProfile("profile", []) as unknown as Record<string, unknown>;
    delete entity.controlledVocabularies;
    expect(controlledVocabulariesOf([entity as unknown as Entity])).toStrictEqual([]);
  });

});
