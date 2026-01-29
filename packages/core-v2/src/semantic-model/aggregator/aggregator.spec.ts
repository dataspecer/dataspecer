import { InMemorySemanticModel } from "../in-memory/index.ts";
import { SemanticModelAggregator } from "./aggregator.ts";
import { createDefaultSemanticModelProfileOperationFactory } from "../profile/operations/index.ts";
import { SEMANTIC_MODEL_RELATIONSHIP_PROFILE } from "../profile/concepts/index.ts";
import { CreatedEntityOperationResult } from "../operations/index.ts";

const factory = createDefaultSemanticModelProfileOperationFactory();

function isCreatedEntityResult(result: any): result is CreatedEntityOperationResult {
  return result.success && "id" in result;
}

test("Aggregator handles circular profile references without infinite loop", () => {
  // Create an in-memory semantic model
  const model = new InMemorySemanticModel();

  // Create a relationship profile
  const createResult = model.executeOperation(
    factory.createRelationshipProfile({
      ends: [
        {
          profiling: [],
          iri: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "domain-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          profiling: [],
          iri: "test-iri",
          name: { "": "test name" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "range-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    })
  );

  expect(createResult.success).toBe(true);
  if (!isCreatedEntityResult(createResult)) {
    throw new Error("Create operation failed");
  }
  const profileId = createResult.id;

  // Create an aggregator and add the model
  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(model);

  // Verify initial state is ok
  const view = aggregator.getView();
  const entities = view.getEntities();
  const initialProfile = entities[profileId];
  expect(initialProfile).toBeDefined();

  // Now modify the profile to reference itself (circular reference)
  // This should NOT cause an OOM error
  const modifyResult = model.executeOperation(
    factory.modifyRelationshipProfile(profileId, {
      ends: [
        {
          profiling: [],
          iri: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "domain-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          // Self-reference: profile references itself
          profiling: [profileId],
          iri: "test-iri",
          name: { "": "test name" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "range-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    })
  );

  // The operation should succeed
  expect(modifyResult.success).toBe(true);

  // The aggregator should still be able to retrieve the profile without hanging
  const updatedEntities = view.getEntities();
  const updatedProfile = updatedEntities[profileId];
  expect(updatedProfile).toBeDefined();
  expect(updatedProfile?.aggregatedEntity?.type).toContain(SEMANTIC_MODEL_RELATIONSHIP_PROFILE);
});

test("Aggregator handles indirect circular profile references", () => {
  // Create an in-memory semantic model
  const model = new InMemorySemanticModel();

  // Create profile A
  const createResultA = model.executeOperation(
    factory.createRelationshipProfile({
      ends: [
        {
          profiling: [],
          iri: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "domain-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          profiling: [],
          iri: "profile-a-iri",
          name: { "": "Profile A" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "range-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    })
  );

  expect(createResultA.success).toBe(true);
  if (!isCreatedEntityResult(createResultA)) {
    throw new Error("Create operation A failed");
  }
  const profileAId = createResultA.id;

  // Create profile B that references A
  const createResultB = model.executeOperation(
    factory.createRelationshipProfile({
      ends: [
        {
          profiling: [],
          iri: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "domain-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          profiling: [profileAId],
          iri: "profile-b-iri",
          name: { "": "Profile B" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "range-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    })
  );

  expect(createResultB.success).toBe(true);
  if (!isCreatedEntityResult(createResultB)) {
    throw new Error("Create operation B failed");
  }
  const profileBId = createResultB.id;

  // Create an aggregator and add the model
  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(model);

  // Now modify profile A to reference B, creating a cycle: A -> B -> A
  const modifyResult = model.executeOperation(
    factory.modifyRelationshipProfile(profileAId, {
      ends: [
        {
          profiling: [],
          iri: null,
          name: null,
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "domain-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
        {
          profiling: [profileBId],
          iri: "profile-a-iri",
          name: { "": "Profile A" },
          nameFromProfiled: null,
          description: null,
          descriptionFromProfiled: null,
          usageNote: null,
          usageNoteFromProfiled: null,
          concept: "range-concept",
          cardinality: null,
          externalDocumentationUrl: null,
          tags: [],
        },
      ],
    })
  );

  // The operation should succeed
  expect(modifyResult.success).toBe(true);

  // The aggregator should still be able to retrieve both profiles without hanging
  const view = aggregator.getView();
  const finalEntities = view.getEntities();
  const profileA = finalEntities[profileAId];
  const profileB = finalEntities[profileBId];
  expect(profileA).toBeDefined();
  expect(profileB).toBeDefined();
});
