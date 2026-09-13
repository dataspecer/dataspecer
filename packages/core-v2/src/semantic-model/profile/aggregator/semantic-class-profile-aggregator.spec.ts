import { describe, it, expect } from "vitest";
import {
  SEMANTIC_MODEL_CLASS,
  SemanticModelClass,
} from "../../concepts/index.ts";
import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  ControlledVocabularyAssignment,
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelClassProfile,
} from "../concepts/index.ts";
import { AggregatedProfiledSemanticModelClass } from "./index.ts";
import {
  SemanticClassProfileAggregator,
} from "./semantic-class-profile-aggregator.ts";

function classProfileFixture(
  overrides: Partial<SemanticModelClassProfile> = {},
): SemanticModelClassProfile {
  return {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: ":1",
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    profiling: [],
    usageNote: null,
    usageNoteFromProfiled: null,
    externalDocumentationUrl: null,
    tags: [],
    controlledVocabularies: [],
    ...overrides,
  };
}

function assignmentFixture(
  overrides: Partial<ControlledVocabularyAssignment> = {},
): ControlledVocabularyAssignment {
  return {
    id: "cv-1",
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "ancestor",
    vocabulary: "voc-1",
    qualifier: "MUST",
    iri: null,
    replaces: null,
    ...overrides,
  };
}

describe("SemanticClassProfileAggregator", () => {

  it("Aggregate class with no profiles.", () => {
    const profile: SemanticModelClassProfile = {
      id: "1",
      type: ["class-profile"],
      iri: ":1",
      name: { "": "name" },
      nameFromProfiled: null,
      description: { "": "description" },
      descriptionFromProfiled: null,
      profiling: [],
      usageNote: { "": "note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
    };
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, []);
    const expected: AggregatedProfiledSemanticModelClass = {
      id: "1",
      type: ["class-profile", "aggregate"],
      iri: ":1",
      name: { "": "name" },
      nameFromProfiled: null,
      description: { "": "description" },
      descriptionFromProfiled: null,
      profiling: [],
      usageNote: { "": "note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      order: null,
      controlledVocabularies: [],
      //
      conceptIris: [],
      conceptIdentifiers: [],
      nameProperty: null,
      descriptionProperty: null,
    };
    expect(actual).toStrictEqual(expected);
  });

  it("Aggregate class with multiple profiles.", () => {
    const profile: SemanticModelClassProfile = {
      id: "1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":1",
      name: { "": "name" },
      nameFromProfiled: "2",
      description: { "": "description" },
      descriptionFromProfiled: "2",
      profiling: ["2", "3"],
      usageNote: { "": "note" },
      usageNoteFromProfiled: "3",
      externalDocumentationUrl: "1-document",
      tags: ["1-role"],
      controlledVocabularies: [],
    }
    const dependencies = [{
      id: "2",
      type: [SEMANTIC_MODEL_CLASS],
      iri: "http://class-2",
      name: { "": "name-2" },
      description: { "": "description-2" },
      nameProperty: null,
      descriptionProperty: "http://description-2",
      externalDocumentationUrl: "2-document",
    } satisfies SemanticModelClass, {
      id: "3",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: "",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      usageNote: { "": "note-3" },
      usageNoteFromProfiled: null,
      profiling: [],
      externalDocumentationUrl: "3-document",
      tags: ["3-role"],
      order: "a",
      controlledVocabularies: [],
    } satisfies SemanticModelClassProfile];
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, dependencies);
    const expected: AggregatedProfiledSemanticModelClass = {
      id: "1",
      type: ["class-profile", "aggregate"],
      iri: ":1",
      name: { "": "name-2" },
      nameFromProfiled: "2",
      description: { "": "description-2" },
      descriptionFromProfiled: "2",
      profiling: ["2", "3"],
      usageNote: { "": "note-3" },
      usageNoteFromProfiled: "3",
      externalDocumentationUrl: "1-document",
      tags: ["1-role"],
      order: null,
      controlledVocabularies: [],
      //
      conceptIris: ["http://class-2"],
      conceptIdentifiers: ["2"],
      nameProperty: null,
      descriptionProperty: "http://description-2",
    };
    expect(actual).toStrictEqual(expected);
  });

  it("Aggregate class without profiling name and description.", () => {
    const profile: SemanticModelClassProfile = {
      id: "1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":1",
      name: { cs: "name" },
      nameFromProfiled: null,
      description: { cs: "description" },
      descriptionFromProfiled: null,
      profiling: ["2", "3"],
      usageNote: { "": "note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: "1-document",
      tags: ["1-role"],
      controlledVocabularies: [],
    };
    const dependencies = [{
      id: "2",
      type: [SEMANTIC_MODEL_CLASS],
      iri: "http://localhost/class",
      name: { cs: "name-2" },
      description: { cs: "description-2" },
      externalDocumentationUrl: "2-document",
    } satisfies SemanticModelClass];
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, dependencies);
    const expected: AggregatedProfiledSemanticModelClass = {
      id: "1",
      type: ["class-profile", "aggregate"],
      iri: ":1",
      name: { "cs": "name" },
      nameFromProfiled: null,
      description: { "cs": "description" },
      descriptionFromProfiled: null,
      profiling: ["2", "3"],
      usageNote: { "": "note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: "1-document",
      tags: ["1-role"],
      order: null,
      controlledVocabularies: [],
      //
      conceptIris: ["http://localhost/class"],
      conceptIdentifiers: ["2"],
      nameProperty: null,
      descriptionProperty: null,
    };
    expect(actual).toStrictEqual(expected);
  });

  it("Aggregate class profile with duplicate IRIs.", () => {
    const profile: SemanticModelClassProfile = {
      id: "profile-1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":profile-1",
      name: { "": "Profile 1" },
      nameFromProfiled: null,
      description: { "": "First profile" },
      descriptionFromProfiled: null,
      profiling: ["class-1", "profile-2"],
      usageNote: { "": "note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
    };
    const dependencies = [{
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: "http://example.com/Dataset",
      name: { "": "Dataset" },
      description: { "": "A dataset" },
      externalDocumentationUrl: null,
    } satisfies SemanticModelClass, {
      id: "profile-2",
      type: ["class-profile", "aggregate"],
      iri: ":profile-2",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      conceptIris: ["http://example.com/Dataset"],
      conceptIdentifiers: ["class-1"],
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
      descriptionProperty: null,
      nameProperty: null,
      order: null,
    } satisfies AggregatedProfiledSemanticModelClass];
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, dependencies);
    // Concepts IRIs should be deduplicated.
    expect(actual.conceptIris).toStrictEqual(["http://example.com/Dataset"]);
    // Concept identifiers should be deduplicated.
    expect(actual.conceptIdentifiers).toStrictEqual(["class-1"]);
  });

  // TODO
  it("Two ancestors with the same vocabulary and qualifier collapse to one inherited assignment.", () => {
    const profile = classProfileFixture({ profiling: ["a", "b"] });
    const profileA = classProfileFixture({
      id: "a", controlledVocabularies: ["cv-a"] });
    const profileB = classProfileFixture({
      id: "b", controlledVocabularies: ["cv-b"] });
    const cvA = assignmentFixture({
      id: "cv-a", classProfile: "a", vocabulary: "voc-1", qualifier: "MUST" });
    const cvB = assignmentFixture({
      id: "cv-b", classProfile: "b", vocabulary: "voc-1", qualifier: "MUST" });
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, [profileA, profileB, cvA, cvB]);
    expect(actual.controlledVocabularies).toStrictEqual(["cv-a"]);
  });

  it("Two ancestors with the same vocabulary but different qualifiers collapse to one inherited assignment (first-seen wins).", () => {
    const profile = classProfileFixture({ profiling: ["a", "b"] });
    const profileA = classProfileFixture({
      id: "a", controlledVocabularies: ["cv-a"] });
    const profileB = classProfileFixture({
      id: "b", controlledVocabularies: ["cv-b"] });
    const cvA = assignmentFixture({
      id: "cv-a", classProfile: "a", vocabulary: "voc-1", qualifier: "MUST" });
    const cvB = assignmentFixture({
      id: "cv-b", classProfile: "b", vocabulary: "voc-1", qualifier: "RECOMMENDED" });
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, [profileA, profileB, cvA, cvB]);
    expect(actual.controlledVocabularies).toStrictEqual(["cv-a"]);
  });

  it("Own assignment beats inherited on matching vocabulary, regardless of qualifier.", () => {
    const profile = classProfileFixture({
      profiling: ["a"], controlledVocabularies: ["cv-own"] });
    const profileA = classProfileFixture({
      id: "a", controlledVocabularies: ["cv-a"] });
    const cvA = assignmentFixture({
      id: "cv-a", classProfile: "a", vocabulary: "voc-1", qualifier: "MUST" });
    const cvOwn = assignmentFixture({
      id: "cv-own", classProfile: "1", vocabulary: "voc-1", qualifier: "RECOMMENDED" });
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, [profileA, cvA, cvOwn]);
    expect(actual.controlledVocabularies).toStrictEqual(["cv-own"]);
  });

  it("Dangling controlled vocabulary assignment id is tolerated without throwing.", () => {
    const profile = classProfileFixture({
      profiling: ["a"], controlledVocabularies: ["missing-own"] });
    const profileA = classProfileFixture({
      id: "a", controlledVocabularies: ["missing-inherited"] });
    expect(() => SemanticClassProfileAggregator.aggregate(
      profile, [profileA])).not.toThrow();
    const actual = SemanticClassProfileAggregator.aggregate(
      profile, [profileA]);
    // The dangling inherited id resolves to nothing and is dropped; the
    // dangling own id is passed through unresolved, same as any other
    // id-only reference elsewhere in this model.
    expect(actual.controlledVocabularies).toStrictEqual(["missing-own"]);
  });

});
