import { Entity, EntityIdentifier } from "../../../entity-model/entity";
import { createDefaultSemanticModelProfileOperationExecutor } from "./operations-executor";
import { createDefaultSemanticModelProfileOperationFactory } from "./operations-factory";
import { SEMANTIC_MODEL_CLASS_PROFILE, SEMANTIC_MODEL_RELATIONSHIP_PROFILE, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "../concepts";

interface ChangeEntry {

  updated: Record<EntityIdentifier, Entity>;

  removed: EntityIdentifier[];
}

const factory = createDefaultSemanticModelProfileOperationFactory();

test("Create class profile.", () => {
  let counter = 0;
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createClassProfile({
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "description-source",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "usage-note-source",
    profiling: ["one", "two"],
    externalDocumentationUrl: "http://example.com/document",
    role: "main",
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
        role: "main",
      }
    },
    removed: []
  });
});

test("Modify class profile, change none.", () => {
  let counter = 0;
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
    role: "main",
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
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
        role: "main",
      }
    },
    removed: []
  });
});

test("Modify class profile, change all.", () => {
  let counter = 0;
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
    role: "main",
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
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
    role: "support",
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
        role: "support",
      }
    },
    removed: []
  });
});

test("Create relationship profile.", () => {
  let counter = 0;
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createRelationshipProfile({
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
      requirementLevel: "first-level",
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
      requirementLevel: "second-level",
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
          requirementLevel: "first-level"
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
          requirementLevel: "second-level",
        }],
      }
    },
    removed: []
  });
});

test("Modify relationship profile.", () => {
  let counter = 0;
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
      requirementLevel: null,
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
      requirementLevel: null,
    }],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
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
      requirementLevel: "first-level"
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
      requirementLevel: "second-level",
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
          requirementLevel: "first-level"
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
          requirementLevel: "second-level",
        }],
      }
    },
    removed: []
  });
});

test("Relationship use all edges.", () => {
  let counter = 0;
  const actual: ChangeEntry[] = [];
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
    { entity: () => null },
    { change: (updated, removed) => actual.push({ updated, removed }) },
  );
  //
  const result = executor.executeOperation(factory.createRelationshipProfile({
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
      requirementLevel: null,
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
      requirementLevel: null,
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
      requirementLevel: null,
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
          requirementLevel: null,
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
          requirementLevel: null,
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
          requirementLevel: null,
        }],
      }
    },
    removed: []
  });
});

test("Issue #917: Change class profile to null.", () => {
  let counter = 0;
  const entities: Record<EntityIdentifier, Entity> = {};
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
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
    iri: "iri",
    name: { "en": "name" },
    nameFromProfiled: "name-source",
    description: { "en": "description" },
    descriptionFromProfiled: "one",
    usageNote: { "en": "usage-note" },
    usageNoteFromProfiled: "one",
    profiling: ["one"],
    externalDocumentationUrl: "profile-document",
    role: "profile-role",
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
    role: null,
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
    role: null,
  });
});

test("Issue #917: Change relationship profile to null.", () => {
  let counter = 0;
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
      requirementLevel: "1-level",
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
      requirementLevel: "2-level",
    }],
  };
  const executor = createDefaultSemanticModelProfileOperationExecutor(
    { createIdentifier: () => (++counter).toString() },
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
      requirementLevel: null,
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
      requirementLevel: null,
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
          requirementLevel: null,
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
          requirementLevel: null,
        }],
      }
    },
    removed: []
  });
});
