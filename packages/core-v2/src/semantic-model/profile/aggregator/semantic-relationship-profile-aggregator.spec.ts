import {
  SEMANTIC_MODEL_RELATIONSHIP,
   SemanticModelRelationship,
   } from "../../concepts/index.ts";
import { SEMANTIC_MODEL_RELATIONSHIP_PROFILE, } from "../concepts/index.ts";
import { createSemanticProfileAggregator } from "./aggregator.ts";

test("Aggregate relationship without profiling name and description.", () => {
  const aggregator = createSemanticProfileAggregator();
  const actual = aggregator.aggregateSemanticModelRelationshipProfile(
    {
      id: "1",
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
      ends: [
        {
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
          externalDocumentationUrl: "1-1-document",
          tags: ["1-1-level"],
        },
        {
          iri: "1-2-iri",
          name: { "": "1-name" },
          nameFromProfiled: null,
          nameProperty: "http://name-profile",
          description: { "": "1-description" },
          descriptionFromProfiled: null,
          descriptionProperty: "http://description-profile",
          cardinality: null,
          concept: "1-2-concept",
          profiling: ["2"],
          usageNote: null,
          usageNoteFromProfiled: "3",
          externalDocumentationUrl: "1-2-document",
          tags: ["1-2-level"],
        },
      ],
    },
    [
      {
        id: "2",
        type: [SEMANTIC_MODEL_RELATIONSHIP],
        name: {},
        description: {},
        iri: null,
        ends: [
          {
            iri: null,
            name: {},
            description: {},
            descriptionFromProfiled: null,
            nameProperty: null,
            descriptionProperty: null,
            cardinality: null,
            concept: "concept",
            externalDocumentationUrl: "2-1-document",
          },
          {
            iri: "2-iri",
            name: { "": "2-name" },
            description: { "": "2-description" },
            nameProperty: "http://name",
            descriptionProperty: "http://description",
            cardinality: [1, 2],
            concept: "2-concept",
            externalDocumentationUrl: "2-2-document",
          },
        ],
      } as SemanticModelRelationship,
    ]
  );

  expect(actual).toStrictEqual({
    id: "1",
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends: [
      {
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
      },
      {
        iri: "1-2-iri",
        name: { "": "1-name" },
        nameFromProfiled: null,
        nameProperty: "http://name-profile",
        description: { "": "1-description" },
        descriptionFromProfiled: null,
        descriptionProperty: "http://description-profile",
        cardinality: [1, 2],
        concept: "1-2-concept",
        profiling: ["2"],
        usageNote: null,
        usageNoteFromProfiled: "3",
        conceptIris: ["2-iri"],
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
      },
    ],
  });
});

test("Aggregate relationship profile with duplicate IRIs should deduplicate conceptIris.", () => {
  const aggregator = createSemanticProfileAggregator();
  const actual = aggregator.aggregateSemanticModelRelationshipProfile(
    {
      id: "rel-profile-1",
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
      ends: [
        {
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
        },
        {
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
        },
      ],
    },
    [
      {
        id: "rel-1",
        type: [SEMANTIC_MODEL_RELATIONSHIP],
        name: {},
        description: {},
        iri: null,
        ends: [
          {
            iri: "rel-1-domain",
            name: { "": "domain" },
            description: { "": "domain desc" },
            cardinality: undefined,
            concept: "domain-concept",
            externalDocumentationUrl: null,
          },
          {
            iri: "http://example.com/title",
            name: { "": "title" },
            description: { "": "The title" },
            cardinality: undefined,
            concept: "range-concept",
            externalDocumentationUrl: null,
          },
        ],
      },
      {
        id: "rel-profile-2",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        ends: [
          {
            iri: "rel-profile-2-domain",
            name: null,
            nameFromProfiled: null,
            description: null,
            descriptionFromProfiled: null,
            cardinality: null,
            concept: "domain-concept",
            profiling: [],
            usageNote: null,
            usageNoteFromProfiled: null,
            conceptIris: [],
            externalDocumentationUrl: null,
            tags: [],
          },
          {
            iri: "rel-profile-2-range",
            name: null,
            nameFromProfiled: null,
            description: null,
            descriptionFromProfiled: null,
            cardinality: null,
            concept: "range-concept",
            profiling: ["rel-1"],
            usageNote: null,
            usageNoteFromProfiled: null,
            conceptIris: ["http://example.com/title"],
            externalDocumentationUrl: null,
            tags: [],
          },
        ],
      },
    ]
  );

  // Should only contain the IRI once in the second end, not twice
  expect(actual.ends[1]?.conceptIris).toStrictEqual(["http://example.com/title"]);
});
