import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import { createDefaultSemanticModelProfileOperationExecutor } from "./operations-executor.ts";
import { createDefaultSemanticModelProfileOperationFactory } from "./operations-factory.ts";
import { CONTROLLED_VOCABULARY_ASSIGNMENT, ControlledVocabularyAssignment, SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../concepts/index.ts";

interface ChangeEntry {

  updated: Record<EntityIdentifier, Entity>;

  removed: EntityIdentifier[];
}

const factory = createDefaultSemanticModelProfileOperationFactory();

test("Create class profile.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createClassProfile({
    id: "1",
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "description-source",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "usage-note-source",
    profiling: ["one", "two"],
    externalDocumentationUrl: "http://example.com/document",
    tags: ["main"],
    controlledVocabularies: [],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: ["1"] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_CLASS_PROFILE],
        iri: "iri",
        name: { "en": "name" },
        nameFromProfiled: "name-source",
        description: { "en": "description" },
        descriptionFromProfiled: "description-source",
        usageNote: { "en": "usage-note" },
        usageNoteFromProfiled: "usage-note-source",
        profiling: ["one", "two"],
        externalDocumentationUrl: "http://example.com/document",
        tags: ["main"],
        controlledVocabularies: [],
      } as SemanticModelClassProfile
    },
    removed: []
  });
});

test("Modify class profile, change none.", () => {
  const actual: ChangeEntry[] = [];
  const previous: SemanticModelClassProfile = {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "description-source",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "usage-note-source",
    profiling: ["one", "two"],
    externalDocumentationUrl: "http://example.com/document",
    tags: ["main"],
    controlledVocabularies: [],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => previous },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyClassProfile("1", {}));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_CLASS_PROFILE],
        iri: "iri",
        name: { "en": "name" },
        nameFromProfiled: "name-source",
        description: { "en": "description" },
        descriptionFromProfiled: "description-source",
        usageNote: { "en": "usage-note" },
        usageNoteFromProfiled: "usage-note-source",
        profiling: ["one", "two"],
        externalDocumentationUrl: "http://example.com/document",
        tags: ["main"],
        order: null,
        controlledVocabularies: [],
      } as SemanticModelClassProfile
    },
    removed: []
  });
});

test("Modify class profile, change all.", () => {
  const actual: ChangeEntry[] = [];
  const previous: SemanticModelClassProfile = {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: "iri",
    name: { "en": "prev-name" },
    nameFromProfiled: "prev-name-source",
    description: { "en": "prev-description" },
    descriptionFromProfiled: "prev-description-source",
    usageNote: { "en": "prev-usage-note" },
    usageNoteFromProfiled: "prev-usage-note-source",
    profiling: ["prev-one", "prev-two"],
    externalDocumentationUrl: "http://example.com/document",
    tags: ["main"],
    controlledVocabularies: [],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => previous },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyClassProfile(
    "1", {
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "description-source",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "usage-note-source",
    profiling: ["one", "two"],
    externalDocumentationUrl: "http://localhost/document",
    tags: ["support"],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_CLASS_PROFILE],
        iri: "iri",
        name: { "en": "name" },
        nameFromProfiled: "name-source",
        description: { "en": "description" },
        descriptionFromProfiled: "description-source",
        usageNote: { "en": "usage-note" },
        usageNoteFromProfiled: "usage-note-source",
        profiling: ["one", "two"],
        externalDocumentationUrl: "http://localhost/document",
        tags: ["support"],
        order: null,
        controlledVocabularies: [],
      } as SemanticModelClassProfile
    },
    removed: []
  });
});

test("Create relationship profile.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createRelationshipProfile({
    id: "1",
    ends: [{
      iri: "first",
      name: { "en": "first-name" },
      nameFromProfiled: "first-name-source",
      description: { "en": "first-description" },
      descriptionFromProfiled: "first-description-source",
      cardinality: [1, 1],
      concept: "first-concept",
      profiling: ["first"],
      usageNote: { "en": "first-note" },
      usageNoteFromProfiled: "first-note-source",
      externalDocumentationUrl: "first-document",
      tags: ["first-level"],
    }, {
      iri: "second",
      name: { "en": "second-name" },
      nameFromProfiled: "second-name-source",
      description: { "en": "second-description" },
      descriptionFromProfiled: "second-description-source",
      cardinality: [1, 1],
      concept: "second-concept",
      profiling: ["second"],
      usageNote: { "en": "second-note" },
      usageNoteFromProfiled: "second-note-source",
      externalDocumentationUrl: "second-document",
      tags: ["second-level"],
    }],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: ["1"] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        ends: [{
          iri: "first",
          name: { "en": "first-name" },
          nameFromProfiled: "first-name-source",
          description: { "en": "first-description" },
          descriptionFromProfiled: "first-description-source",
          cardinality: [1, 1],
          concept: "first-concept",
          profiling: ["first"],
          usageNote: { "en": "first-note" },
          usageNoteFromProfiled: "first-note-source",
          externalDocumentationUrl: "first-document",
          tags: ["first-level"],
          order: null,
        }, {
          iri: "second",
          name: { "en": "second-name" },
          nameFromProfiled: "second-name-source",
          description: { "en": "second-description" },
          descriptionFromProfiled: "second-description-source",
          cardinality: [1, 1],
          concept: "second-concept",
          profiling: ["second"],
          usageNote: { "en": "second-note" },
          usageNoteFromProfiled: "second-note-source",
          externalDocumentationUrl: "second-document",
          tags: ["second-level"],
          order: null,
        }],
      }
    },
    removed: []
  });
});

test("Modify relationship profile.", () => {
  const actual: ChangeEntry[] = [];
  const previous: SemanticModelRelationshipProfile = {
    id: "1",
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends: [{
      iri: "first",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      cardinality: null,
      concept: "first-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      iri: "second",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      cardinality: null,
      concept: "second-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => previous },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyRelationshipProfile(
    "1", {
    ends: [{
      iri: "first",
      name: { "en": "first-name" },
      nameFromProfiled: "first-name-source",
      description: { "en": "first-description" },
      descriptionFromProfiled: "first-description-source",
      cardinality: [1, 1],
      concept: "first-c",
      profiling: ["first"],
      usageNote: { "en": "first-note" },
      usageNoteFromProfiled: "first-note-source",
      externalDocumentationUrl: "first-document",
      tags: ["first-level"],
    }, {
      iri: "second",
      name: { "en": "second-name" },
      nameFromProfiled: "second-name-source",
      description: { "en": "second-description" },
      descriptionFromProfiled: "second-description-source",
      cardinality: [1, 1],
      concept: "second-c",
      profiling: ["second"],
      usageNote: { "en": "second-note" },
      usageNoteFromProfiled: "second-note-source",
      externalDocumentationUrl: "second-document",
      tags: ["second-level"],
    }],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        ends: [{
          iri: "first",
          name: { "en": "first-name" },
          nameFromProfiled: "first-name-source",
          description: { "en": "first-description" },
          descriptionFromProfiled: "first-description-source",
          cardinality: [1, 1],
          concept: "first-c",
          profiling: ["first"],
          usageNote: { "en": "first-note" },
          usageNoteFromProfiled: "first-note-source",
          externalDocumentationUrl: "first-document",
          tags: ["first-level"],
        }, {
          iri: "second",
          name: { "en": "second-name" },
          nameFromProfiled: "second-name-source",
          description: { "en": "second-description" },
          descriptionFromProfiled: "second-description-source",
          cardinality: [1, 1],
          concept: "second-c",
          profiling: ["second"],
          usageNote: { "en": "second-note" },
          usageNoteFromProfiled: "second-note-source",
          externalDocumentationUrl: "second-document",
          tags: ["second-level"],
        }],
      }
    },
    removed: []
  });
});

test("Relationship use all edges.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createRelationshipProfile({
    id: "1",
    ends: [{
      iri: "first",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      cardinality: null,
      concept: "first-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      iri: "second",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      cardinality: null,
      concept: "second-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      iri: "third",
      name: null,
      nameFromProfiled: null,
      description: null,
      descriptionFromProfiled: null,
      cardinality: null,
      concept: "third-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: ["1"] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        ends: [{
          iri: "first",
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          cardinality: null,
          concept: "first-c",
          profiling: [],
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
          order: null,
        }, {
          iri: "second",
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          cardinality: null,
          concept: "second-c",
          profiling: [],
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
          order: null,
        }, {
          iri: "third",
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          cardinality: null,
          concept: "third-c",
          profiling: [],
          usageNote: null,
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
          order: null,
        }],
      }
    },
    removed: []
  });
});

test("Issue #917: Change class profile to null.", () => {
  const entities: Record<EntityIdentifier, Entity> = {};
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: (identifier) => entities[identifier] ?? null },
    {
      change: (updated, removed) => {
        removed.forEach(identifier => delete entities[identifier]);
        Object.entries(updated).forEach(([identifier, value]) => {
          entities[identifier] = value;
        })
      }
    },
  );
  //
  const result = executor.executeOperation(factory.createClassProfile({
    id: "1",
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "one",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "one",
    profiling: ["one"],
    externalDocumentationUrl: "profile-document",
    tags: ["profile-role"],
    controlledVocabularies: [],
  }));
  expect(result).toStrictEqual({ success: true, created: ["1"] });
  executor.executeOperation(factory.modifyClassProfile("1", {
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: null,
    description: { "en": "description" },
    descriptionFromProfiled: null,
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: null,
    profiling: ["one"],
    externalDocumentationUrl: null,
    tags: [],
  }));
  //
  expect(entities["1"]).toStrictEqual({
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: null,
    description: { "en": "description" },
    descriptionFromProfiled: null,
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: null,
    profiling: ["one"],
    externalDocumentationUrl: null,
    tags: [],
    order: null,
    controlledVocabularies: [],
  } as SemanticModelClassProfile);
});

test("Issue #917: Change relationship profile to null.", () => {
  const actual: ChangeEntry[] = [];
  const previous: SemanticModelRelationshipProfile = {
    id: "1",
    type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
    ends: [{
      iri: "first",
      name: null,
      nameFromProfiled: "1",
      description: null,
      descriptionFromProfiled: "1",
      cardinality: null,
      concept: "first-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: "1",
      externalDocumentationUrl: "1-document",
      tags: ["1-level"],
    }, {
      iri: "second",
      name: null,
      nameFromProfiled: "2",
      description: null,
      descriptionFromProfiled: "2",
      cardinality: null,
      concept: "second-c",
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: "2",
      externalDocumentationUrl: "2-document",
      tags: ["2-level"],
    }],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { entity: () => previous },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyRelationshipProfile(
    "1", {
    ends: [{
      iri: "first",
      name: { "en": "first-name" },
      nameFromProfiled: null,
      description: { "en": "first-description" },
      descriptionFromProfiled: null,
      cardinality: [1, 1],
      concept: "first-c",
      profiling: ["first"],
      usageNote: { "en": "first-note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      iri: "second",
      name: { "en": "second-name" },
      nameFromProfiled: null,
      description: { "en": "second-description" },
      descriptionFromProfiled: null,
      cardinality: [1, 1],
      concept: "second-c",
      profiling: ["second"],
      usageNote: { "en": "second-note" },
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }],
  }));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": {
        id: "1",
        type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
        ends: [{
          iri: "first",
          name: { "en": "first-name" },
          nameFromProfiled: null,
          description: { "en": "first-description" },
          descriptionFromProfiled: null,
          cardinality: [1, 1],
          concept: "first-c",
          profiling: ["first"],
          usageNote: { "en": "first-note" },
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }, {
          iri: "second",
          name: { "en": "second-name" },
          nameFromProfiled: null,
          description: { "en": "second-description" },
          descriptionFromProfiled: null,
          cardinality: [1, 1],
          concept: "second-c",
          profiling: ["second"],
          usageNote: { "en": "second-note" },
          usageNoteFromProfiled: null,
          externalDocumentationUrl: null,
          tags: [],
        }],
      }
    },
    removed: []
  });
});

function classProfileFixture(
  overrides: Partial<SemanticModelClassProfile> = {},
): SemanticModelClassProfile {
  return {
    id: "1",
    type: [SEMANTIC_MODEL_CLASS_PROFILE],
    iri: "iri",
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    usageNote: null,
    usageNoteFromProfiled: null,
    profiling: [],
    externalDocumentationUrl: null,
    tags: [],
    controlledVocabularies: [],
    ...overrides,
  };
}

function tableReader(entities: Record<EntityIdentifier, Entity>) {
  return { entity: (identifier: EntityIdentifier) => entities[identifier] ?? null };
}

test("Create controlled vocabulary assignment.", () => {
  const actual: ChangeEntry[] = [];
  const classProfile = classProfileFixture();
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "1": classProfile }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createControlledVocabularyAssignment(
    { id: "cv-1", classProfile: "1", vocabulary: "voc-1", qualifier: "MUST" }));
  //
  expect(result).toStrictEqual({ success: true, created: ["cv-1"] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "cv-1": {
        id: "cv-1",
        type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
        classProfile: "1",
        vocabulary: "voc-1",
        qualifier: "MUST",
        replaces: null,
        iri: null,
      } as ControlledVocabularyAssignment,
      "1": {
        ...classProfile,
        controlledVocabularies: ["cv-1"],
      } as SemanticModelClassProfile,
    },
    removed: [],
  });
});

test("Create controlled vocabulary assignment, a stored iri is preserved.", () => {
  const actual: ChangeEntry[] = [];
  const classProfile = classProfileFixture();
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "1": classProfile }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createControlledVocabularyAssignment(
    {
      id: "cv-1", classProfile: "1", vocabulary: "voc-1", qualifier: "MUST",
      iri: "http://example.com/imported-assignment",
    }));
  //
  expect(result).toStrictEqual({ success: true, created: ["cv-1"] });
  expect(actual.length).toBe(1);
  expect((actual[0]!.updated["cv-1"] as ControlledVocabularyAssignment).iri)
    .toBe("http://example.com/imported-assignment");
});

test("Create controlled vocabulary assignment, same vocabulary with a different qualifier is allowed.", () => {
  const actual: ChangeEntry[] = [];
  const cv1: ControlledVocabularyAssignment = {
    id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "1", vocabulary: "voc-1", qualifier: "MUST", replaces: null, iri: null,
  };
  const classProfile = classProfileFixture({ controlledVocabularies: ["cv-1"] });
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "1": classProfile, "cv-1": cv1 }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createControlledVocabularyAssignment(
    { id: "cv-2", classProfile: "1", vocabulary: "voc-1", qualifier: "MAY" }));
  //
  expect(result).toStrictEqual({ success: true, created: ["cv-2"] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "cv-2": {
        id: "cv-2",
        type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
        classProfile: "1",
        vocabulary: "voc-1",
        qualifier: "MAY",
        replaces: null,
        iri: null,
      } as ControlledVocabularyAssignment,
      "1": {
        ...classProfile,
        controlledVocabularies: ["cv-1", "cv-2"],
      } as SemanticModelClassProfile,
    },
    removed: [],
  });
});

test("Create controlled vocabulary assignment, exact (vocabulary, qualifier) duplicate is rejected.", () => {
  const actual: ChangeEntry[] = [];
  const cv1: ControlledVocabularyAssignment = {
    id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "1", vocabulary: "voc-1", qualifier: "MUST", replaces: null, iri: null,
  };
  const classProfile = classProfileFixture({ controlledVocabularies: ["cv-1"] });
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "1": classProfile, "cv-1": cv1 }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createControlledVocabularyAssignment(
    { id: "cv-2", classProfile: "1", vocabulary: "voc-1", qualifier: "MUST" }));
  //
  expect(result).toStrictEqual({ success: false, created: [] });
  expect(actual.length).toBe(0);
});

test("Create controlled vocabulary assignment, target is not a class profile is rejected.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({}),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createControlledVocabularyAssignment(
    { id: "cv-1", classProfile: "missing", vocabulary: "voc-1", qualifier: "MUST" }));
  //
  expect(result).toStrictEqual({ success: false, created: [] });
  expect(actual.length).toBe(0);
});

test("Remove controlled vocabulary assignment.", () => {
  const actual: ChangeEntry[] = [];
  const cv1: ControlledVocabularyAssignment = {
    id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "1", vocabulary: "voc-1", qualifier: "MUST", replaces: null, iri: null,
  };
  const classProfile = classProfileFixture({ controlledVocabularies: ["cv-1"] });
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "1": classProfile, "cv-1": cv1 }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(
    factory.removeControlledVocabularyAssignment("cv-1"));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "1": { ...classProfile, controlledVocabularies: [] } as SemanticModelClassProfile,
    },
    removed: ["cv-1"],
  });
});

test("Remove controlled vocabulary assignment, target not found is rejected.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({}),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(
    factory.removeControlledVocabularyAssignment("missing"));
  //
  expect(result).toStrictEqual({ success: false, created: [] });
  expect(actual.length).toBe(0);
});

test("Modify controlled vocabulary assignment.", () => {
  const actual: ChangeEntry[] = [];
  const cv1: ControlledVocabularyAssignment = {
    id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "1", vocabulary: "voc-1", qualifier: "MUST", replaces: null, iri: null,
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "cv-1": cv1 }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyControlledVocabularyAssignment(
    "cv-1", { qualifier: "RECOMMENDED", replaces: { kind: "local", target: "cv-0" } }));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "cv-1": {
        ...cv1,
        qualifier: "RECOMMENDED",
        replaces: { kind: "local", target: "cv-0" },
      } as ControlledVocabularyAssignment,
    },
    removed: [],
  });
});

test("Modify controlled vocabulary assignment, an imported replaces is stored.", () => {
  const actual: ChangeEntry[] = [];
  const cv1: ControlledVocabularyAssignment = {
    id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "1", vocabulary: "voc-1", qualifier: "MUST", replaces: null, iri: null,
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({ "cv-1": cv1 }),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyControlledVocabularyAssignment(
    "cv-1", { replaces: { kind: "imported", iri: "http://foreign.example.com/some-assignment" } }));
  //
  expect(result).toStrictEqual({ success: true, created: [] });
  expect(actual.length).toBe(1);
  expect(actual[0]).toStrictEqual({
    updated: {
      "cv-1": {
        ...cv1,
        replaces: { kind: "imported", iri: "http://foreign.example.com/some-assignment" },
      } as ControlledVocabularyAssignment,
    },
    removed: [],
  });
});

test("Modify controlled vocabulary assignment, target not found is rejected.", () => {
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    tableReader({}),
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.modifyControlledVocabularyAssignment(
    "missing", { qualifier: "RECOMMENDED" }));
  //
  expect(result).toStrictEqual({ success: false, created: [] });
  expect(actual.length).toBe(0);
});
