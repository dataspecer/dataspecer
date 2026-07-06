import { describe, it, expect } from "vitest";
import {
  SEMANTIC_MODEL_CLASS,
  SemanticModelClass,
} from "../../concepts/index.ts";
import {
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelClassProfile,
} from "../concepts/index.ts";
import { AggregatedProfiledSemanticModelClass } from "./index.ts";
import {
  SemanticClassProfileAggregator,
} from "./semantic-class-profile-aggregator.ts";

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
  });

});
