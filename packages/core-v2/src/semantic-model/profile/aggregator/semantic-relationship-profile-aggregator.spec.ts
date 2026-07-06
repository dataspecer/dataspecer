import { describe, it, expect } from "vitest";
import {
  SemanticModelRelationship,
} from "../../concepts/index.ts";
import {
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import {
  SemanticRelationshipProfileAggregator,
} from "./semantic-relationship-profile-aggregator.ts";
import {
  AggregatedProfiledSemanticModelRelationship,
} from "./aggregator-concepts.ts";

describe("SemanticRelationshipProfileAggregator", () => {

  it("Aggregate relationship without profiling name and description.", () => {
    const profile: SemanticModelRelationshipProfile = {
      id: "1",
      type: ["relationship-profile"],
      ends: [{
        iri: "1-1-iri",
        name: null,
        nameFromProfiled: null,
        description: null,
        descriptionFromProfiled: null,
        cardinality: null,
        concept: "1-1-concept",
        profiling: ["2"],
        usageNote: null,
        usageNoteFromProfiled: "2",
        externalDocumentationUrl: "1-1-document",
        tags: ["1-1-level"],
      }, {
        iri: "1-2-iri",
        name: { "": "1-name" },
        nameFromProfiled: null,
        description: { "": "1-description" },
        descriptionFromProfiled: null,
        cardinality: null,
        concept: "1-2-concept",
        profiling: ["2"],
        usageNote: null,
        usageNoteFromProfiled: "3",
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
      }],
    };
    const dependencies = [{
      id: "2",
      type: ["relationship"],
      name: {},
      description: {},
      iri: null,
      ends: [{
        iri: null,
        name: {},
        nameProperty: null,
        description: {},
        descriptionProperty: null,
        cardinality: null,
        concept: "concept",
        externalDocumentationUrl: "2-1-document",
      }, {
        iri: "2-iri",
        name: { "": "2-name" },
        nameProperty: "http://name",
        description: { "": "2-description" },
        descriptionProperty: "http://description",
        cardinality: [1, 2],
        concept: "2-concept",
        externalDocumentationUrl: "2-2-document",
      }],
    } as SemanticModelRelationship];
    const actual = SemanticRelationshipProfileAggregator.aggregate(
      profile, dependencies);
    const expected: AggregatedProfiledSemanticModelRelationship = {
      id: "1",
      type: ["relationship-profile", "aggregate"],
      ends: [{
        iri: "1-1-iri",
        name: null,
        nameFromProfiled: null,
        nameProperty: null,
        description: null,
        descriptionFromProfiled: null,
        descriptionProperty: null,
        cardinality: null,
        concept: "1-1-concept",
        profiling: ["2"],
        usageNote: null,
        usageNoteFromProfiled: "2",
        conceptIris: [],
        externalDocumentationUrl: "1-1-document",
        tags: ["1-1-level"],
        order: null,
      }, {
        iri: "1-2-iri",
        name: { "": "1-name" },
        nameFromProfiled: null,
        nameProperty: null,
        description: { "": "1-description" },
        descriptionFromProfiled: null,
        descriptionProperty: null,
        cardinality: [1, 2],
        concept: "1-2-concept",
        profiling: ["2"],
        usageNote: null,
        usageNoteFromProfiled: "3",
        conceptIris: ["2-iri"],
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
        order: null,
      }],
    };
    expect(actual).toStrictEqual(expected);
  });

  it("Aggregate relationship profile with duplicate IRIs.", () => {
    const profile: SemanticModelRelationshipProfile = {
      id: "rel-profile-1",
      type: ["relationship-profile"],
      ends: [{
        iri: "rel-profile-1-domain",
        name: null,
        nameFromProfiled: null,
        description: null,
        descriptionFromProfiled: null,
        cardinality: null,
        concept: "domain-concept",
        profiling: [],
        usageNote: null,
        usageNoteFromProfiled: null,
        externalDocumentationUrl: null,
        tags: [],
      }, {
        iri: "rel-profile-1-range",
        name: { "": "title" },
        nameFromProfiled: null,
        description: null,
        descriptionFromProfiled: null,
        cardinality: null,
        concept: "range-concept",
        profiling: ["rel-1", "rel-profile-2"],
        usageNote: null,
        usageNoteFromProfiled: null,
        externalDocumentationUrl: null,
        tags: [],
      }],
    };
    const dependencies = [{
      id: "rel-1",
      type: ["relationship"],
      iri: "",
      name: {},
      nameProperty: null,
      description: {},
      descriptionProperty: null,
      ends: [{
        iri: null,
        name: {},
        description: {},
        cardinality: undefined,
        concept: "domain-concept",
        externalDocumentationUrl: null,
        order: null,
      }, {
        iri: "http://example.com/title",
        name: {},
        description: {},
        cardinality: undefined,
        concept: "range-concept",
        externalDocumentationUrl: null,
        order: null,
      }],
    } satisfies SemanticModelRelationship, {
      id: "rel-profile-2",
      type: ["relationship-profile", "aggregate"],
      ends: [{
        iri: null,
        profiling: [],
        name: null,
        nameFromProfiled: null,
        nameProperty: null,
        description: null,
        descriptionFromProfiled: null,
        descriptionProperty: null,
        cardinality: null,
        concept: "domain-concept",
        externalDocumentationUrl: null,
        usageNote: null,
        usageNoteFromProfiled: null,
        tags: [],
        order: null,
        conceptIris: [],
      }, {
        iri: "http://example.com/title-profile",
        profiling: [],
        name: null,
        nameFromProfiled: null,
        nameProperty: null,
        description: null,
        descriptionFromProfiled: null,
        descriptionProperty: null,
        cardinality: null,
        concept: "range-concept",
        externalDocumentationUrl: null,
        usageNote: null,
        usageNoteFromProfiled: null,
        tags: [],
        order: null,
        conceptIris: ["http://example.com/title"],
      }],
    } satisfies AggregatedProfiledSemanticModelRelationship];
    const actual = SemanticRelationshipProfileAggregator.aggregate(
      profile, dependencies);
    const end = actual.ends[1];
    expect(end).toBeDefined();
    expect(end!.conceptIris).toStrictEqual(["http://example.com/title"]);
  });

  it("Aggregate relationship with a profiles.", () => {
    const profile: SemanticModelRelationshipProfile = {
      id: "1",
      type: ["relationship-profile"],
      ends: [{
        iri: "1-1-iri",
        name: null,
        nameFromProfiled: "2",
        description: null,
        descriptionFromProfiled: "2",
        cardinality: null,
        concept: "1-1-concept",
        profiling: ["2", "4"],
        usageNote: null,
        usageNoteFromProfiled: "2",
        externalDocumentationUrl: "1-1-document",
        tags: ["1-1-level"],
      }, {
        iri: "1-2-iri",
        name: null,
        nameFromProfiled: "3",
        description: null,
        descriptionFromProfiled: "3",
        cardinality: null,
        concept: "1-2-concept",
        profiling: ["3"],
        usageNote: null,
        usageNoteFromProfiled: "3",
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
      }],
    };
    const dependencies = [{
      id: "2",
      type: ["relationship-profile"],
      // The second end is not used.
      ends: [{
        iri: "2-iri",
        name: { "": "2-name" },
        nameFromProfiled: null,
        description: { "": "2-description" },
        descriptionFromProfiled: null,
        cardinality: [0, null],
        concept: "2-concept",
        profiling: [],
        usageNote: { "": "2-note" },
        usageNoteFromProfiled: null,
        externalDocumentationUrl: "2-document",
        tags: ["2-level"],
      }],
    } satisfies SemanticModelRelationshipProfile, {
      id: "3",
      type: ["relationship-profile"],
      // The first end is not used.
      ends: [null as any, {
        iri: "3-iri",
        name: { "": "3-name" },
        nameFromProfiled: null,
        description: { "": "3-description" },
        descriptionFromProfiled: null,
        cardinality: [0, 2],
        concept: "3-concept",
        profiling: [],
        usageNote: { "": "3-note" },
        usageNoteFromProfiled: null,
        externalDocumentationUrl: "3-document",
        tags: ["3-level"],
      }],
    } satisfies SemanticModelRelationshipProfile, {
      id: "4",
      type: ["relationship-profile"],
      // The second end is not used.
      ends: [{
        iri: "4-iri",
        name: { "": "4-name" },
        nameFromProfiled: null,
        description: { "": "4-description" },
        descriptionFromProfiled: null,
        cardinality: [1, 2],
        concept: "4-concept",
        profiling: [],
        usageNote: { "": "4-note" },
        usageNoteFromProfiled: null,
        externalDocumentationUrl: "4-document",
        tags: ["4-level"],
      }],
    } satisfies SemanticModelRelationshipProfile];
    const actual = SemanticRelationshipProfileAggregator.aggregate(
      profile, dependencies);
    const expected: AggregatedProfiledSemanticModelRelationship = {
      id: "1",
      type: ["relationship-profile", "aggregate"],
      ends: [{
        iri: "1-1-iri",
        name: { "": "2-name" },
        nameFromProfiled: "2",
        nameProperty: null,
        description: { "": "2-description" },
        descriptionFromProfiled: "2",
        descriptionProperty: null,
        cardinality: [1, 2],
        concept: "1-1-concept",
        profiling: ["2", "4"],
        usageNote: { "": "2-note" },
        usageNoteFromProfiled: "2",
        conceptIris: [],
        externalDocumentationUrl: "1-1-document",
        tags: ["1-1-level"],
        order: null,
      }, {
        iri: "1-2-iri",
        name: { "": "3-name" },
        nameFromProfiled: "3",
        nameProperty: null,
        description: { "": "3-description" },
        descriptionFromProfiled: "3",
        descriptionProperty: null,
        cardinality: [0, 2],
        concept: "1-2-concept",
        profiling: ["3"],
        usageNote: { "": "3-note" },
        usageNoteFromProfiled: "3",
        conceptIris: [],
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
        order: null,
      }],
    };
    expect(actual).toStrictEqual(expected);
  });

});
