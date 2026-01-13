import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_RELATIONSHIP, SemanticModelClass, SemanticModelRelationship } from "../../concepts/index.ts";
import { SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE, SemanticModelClassProfile } from "../concepts/index.ts";
import { AggregatedProfiledSemanticModelClass, createDefaultProfileEntityAggregator } from "./aggregator.ts";

test("Aggregate class with no profiles.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const profile: AggregatedProfiledSemanticModelClass = {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: ":1",
    name: { "": "name" },
    nameFromProfiled: null,
    description: { "": "description" },
    descriptionFromProfiled: null,
    profiling: [],
    usageNote: { "": "note" },
    usageNoteFromProfiled: null,
    conceptIris: [],
    externalDocumentationUrl: null,
    tags: [],
  };
  const actual = aggregator.aggregateSemanticModelClassProfile(profile, []);
  expect(actual).toStrictEqual(actual);
});

test("Aggregate class with multiple profiles.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const actual = aggregator.aggregateSemanticModelClassProfile(
    {
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
    },
    [
      {
        id: "2",
        type: [SEMANTIC_MODEL_CLASS],
        iri: "",
        name: { "": "name-2" },
        description: { "": "description-2" },
        externalDocumentationUrl: "2-document",
      },
      {
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
      },
    ]
  );
  expect(actual).toStrictEqual({
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: ":1",
    name: { "": "name-2" },
    nameFromProfiled: "2",
    description: { "": "description-2" },
    descriptionFromProfiled: "2",
    profiling: ["2", "3"],
    usageNote: { "": "note-3" },
    usageNoteFromProfiled: "3",
    conceptIris: [],
    externalDocumentationUrl: "1-document",
    tags: ["1-role"],
  });
});

test("Aggregate relationship with a profiles.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const actual = aggregator.aggregateSemanticModelRelationshipProfile(
    {
      id: "1",
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
      ends: [
        {
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
        },
        {
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
        },
      ],
    },
    [
      {
        id: "2",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        // The second end is not used.
        ends: [
          {
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
          },
        ],
      },
      {
        id: "3",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        // The first end is not used.
        ends: [
          null as any,
          {
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
          },
        ],
      },
      {
        id: "4",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        // The second end is not used.
        ends: [
          {
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
          },
        ],
      },
    ]
  );
  expect(actual).toStrictEqual({
    id: "1",
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends: [
      {
        iri: "1-1-iri",
        name: { "": "2-name" },
        nameFromProfiled: "2",
        description: { "": "2-description" },
        descriptionFromProfiled: "2",
        cardinality: [1, 2],
        concept: "1-1-concept",
        profiling: ["2", "4"],
        usageNote: { "": "2-note" },
        usageNoteFromProfiled: "2",
        conceptIris: [],
        externalDocumentationUrl: "1-1-document",
        tags: ["1-1-level"],
      },
      {
        iri: "1-2-iri",
        name: { "": "3-name" },
        nameFromProfiled: "3",
        description: { "": "3-description" },
        descriptionFromProfiled: "3",
        cardinality: [0, 2],
        concept: "1-2-concept",
        profiling: ["3"],
        usageNote: { "": "3-note" },
        usageNoteFromProfiled: "3",
        conceptIris: [],
        externalDocumentationUrl: "1-2-document",
        tags: ["1-2-level"],
      },
    ],
  });
});

test("Aggregate class without profiling name and description.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const actual = aggregator.aggregateSemanticModelClassProfile(
    {
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
    } satisfies SemanticModelClassProfile,
    [
      {
        id: "2",
        type: [SEMANTIC_MODEL_CLASS],
        iri: "",
        name: { cs: "name-2" },
        description: { cs: "description-2" },
        externalDocumentationUrl: "2-document",
      } satisfies SemanticModelClass,
    ]
  );

  expect(actual).toStrictEqual({
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: ":1",
    name: { "cs": "name" },
    nameFromProfiled: null,
    description: { "cs": "description" },
    descriptionFromProfiled: null,
    profiling: ["2", "3"],
    usageNote: { "": "note" },
    usageNoteFromProfiled: null,
    conceptIris: [],
    externalDocumentationUrl: "1-document",
    tags: ["1-role"],
  });
});

test("Aggregate relationship without profiling name and description.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const actual = aggregator.aggregateSemanticModelRelationshipProfile(
    {
      id: "1",
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
      ends: [
        {
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
        },
        {
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
            cardinality: null,
            concept: "concept",
            externalDocumentationUrl: "2-1-document",
          },
          {
            iri: "2-iri",
            name: { "": "2-name" },
            description: { "": "2-description" },
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
        description: null,
        descriptionFromProfiled: null,
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
        description: { "": "1-description" },
        descriptionFromProfiled: null,
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

test("Aggregate class profile with duplicate IRIs should deduplicate conceptIris.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
  const actual = aggregator.aggregateSemanticModelClassProfile(
    {
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
    },
    [
      {
        id: "class-1",
        type: [SEMANTIC_MODEL_CLASS],
        iri: "http://example.com/Dataset",
        name: { "": "Dataset" },
        description: { "": "A dataset" },
        externalDocumentationUrl: null,
      },
      {
        id: "profile-2",
        type: [SEMANTIC_MODEL_CLASS_PROFILE],
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
      } satisfies AggregatedProfiledSemanticModelClass,
    ]
  );

  // Should only contain the IRI once, not twice
  expect(actual.conceptIris).toStrictEqual(["http://example.com/Dataset"]);
});

test("Aggregate relationship profile with duplicate IRIs should deduplicate conceptIris.", () => {
  const aggregator = createDefaultProfileEntityAggregator();
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
