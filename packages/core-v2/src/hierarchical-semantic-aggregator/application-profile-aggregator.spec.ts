import { describe, expect, it } from "vitest";
import type { Entity, EntityChange } from "@dataspecer/core/entity-model";
import { LOCAL_SEMANTIC_MODEL } from "../model/known-models.ts";
import { assignmentFixture, classProfileFixture } from "../semantic-model/profile/test-fixtures.ts";
import { ApplicationProfileAggregator } from "./application-profile-aggregator.ts";
import { VocabularyAggregator } from "./vocabulary-aggregator.ts";
import type { EntityModel } from "./utils/entity-model.ts";

/**
 * Creates an entity model out of the given entities, next to the entity
 * describing the model itself, which every model needs to have.
 */
function createModel(id: string, entities: Entity[]): EntityModel {
  return {
    getEntities: () => Object.fromEntries([
      { id, type: [LOCAL_SEMANTIC_MODEL], baseIri: "http://example.com/" },
      ...entities,
    ].map(entity => [entity.id, entity])),
    subscribeToChanges: () => { },
    executeOperation: () => { },
  };
}

/**
 * The aggregator is stateful. It observes a profile model on top of a source
 * of vocabulary entities, see {@link ApplicationProfileAggregator}. 
 * So a test has to put the entities into a model and read the result from the aggregator. 
 * This helper only does that setup, all the aggregation is done by
 * {@link ApplicationProfileAggregator}. The vocabulary is empty, as the tests
 * work with profiles only.
 *
 * @returns Aggregated entities by their identifier.
 */
function getAggregatedEntities(entities: Entity[]) {
  const vocabulary = new VocabularyAggregator(createModel("vocabulary-model", []));
  const aggregator = new ApplicationProfileAggregator(
    createModel("profile-model", entities), vocabulary);
  return aggregator.getAggregatedEntities();
}

function controlledVocabulariesOf(
  entities: ReturnType<typeof getAggregatedEntities>, id: string,
): string[] {
  const aggregated = entities[id]?.aggregatedEntity as unknown as
    { controlledVocabularies?: string[] };
  return aggregated.controlledVocabularies ?? [];
}

describe("ApplicationProfileAggregator", () => {

  describe("controlled vocabulary assignments of class profiles", () => {

    it("Inherits the assignment of a profiled class profile.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "parent", controlledVocabularies: ["parent-assignment"] }),
        classProfileFixture({ id: "child", profiling: ["parent"] }),
        assignmentFixture({ id: "parent-assignment", classProfile: "parent" }),
      ]);
      expect(controlledVocabulariesOf(entities, "child"))
        .toStrictEqual(["parent-assignment"]);
    });

    it("Removes the inherited assignment that an own assignment replaces.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "parent", controlledVocabularies: ["parent-assignment"] }),
        classProfileFixture({
          id: "child", profiling: ["parent"], controlledVocabularies: ["child-assignment"],
        }),
        assignmentFixture({ id: "parent-assignment", classProfile: "parent", qualifier: "may" }),
        assignmentFixture({
          id: "child-assignment",
          classProfile: "child",
          qualifier: "must",
          replaces: { kind: "local", target: "parent-assignment" },
        }),
      ]);
      expect(controlledVocabulariesOf(entities, "child"))
        .toStrictEqual(["child-assignment"]);
    });

    it("Keeps both assignments for the same vocabulary when the own one does not replace.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "parent", controlledVocabularies: ["parent-assignment"] }),
        classProfileFixture({
          id: "child", profiling: ["parent"], controlledVocabularies: ["child-assignment"],
        }),
        assignmentFixture({ id: "parent-assignment", classProfile: "parent", qualifier: "may" }),
        assignmentFixture({ id: "child-assignment", classProfile: "child", qualifier: "must" }),
      ]);
      expect(controlledVocabulariesOf(entities, "child"))
        .toStrictEqual(["parent-assignment", "child-assignment"]);
    });

  });

  describe("controlled vocabulary assignments as aggregated entities", () => {

    it("Provides the assignment next to the class profile that owns it.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "profile", controlledVocabularies: ["assignment"] }),
        assignmentFixture({ id: "assignment", classProfile: "profile", qualifier: "must" }),
      ]);
      expect(entities["assignment"]?.aggregatedEntity).toMatchObject({
        id: "assignment",
        classProfile: "profile",
        qualifier: "must",
      });
    });

    it("Provides the inherited assignment under its own identifier.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "parent", controlledVocabularies: ["parent-assignment"] }),
        classProfileFixture({ id: "child", profiling: ["parent"] }),
        assignmentFixture({ id: "parent-assignment", classProfile: "parent" }),
      ]);
      for (const id of controlledVocabulariesOf(entities, "child")) {
        expect(entities[id]).toBeDefined();
      }
    });

    it("Notifies about the assignment and its class profile when the assignment changes.", () => {
      let notifyModel: (changes: EntityChange[]) => void = () => { };
      const model = createModel("profile-model", [
        classProfileFixture({ id: "profile", controlledVocabularies: ["assignment"] }),
        assignmentFixture({ id: "assignment", classProfile: "profile", qualifier: "may" }),
      ]);
      model.subscribeToChanges = callback => { notifyModel = callback; };
      const aggregator = new ApplicationProfileAggregator(
        model, new VocabularyAggregator(createModel("vocabulary-model", [])));
      const updatedIds: string[] = [];
      aggregator.subscribeToChanges(updated => updatedIds.push(...Object.keys(updated)));

      const previous = assignmentFixture({ id: "assignment", classProfile: "profile", qualifier: "may" });
      const next = assignmentFixture({ id: "assignment", classProfile: "profile", qualifier: "must" });
      notifyModel([{ previous, next }]);

      expect(updatedIds).toContain("assignment");
      expect(updatedIds).toContain("profile");
      expect(aggregator.getAggregatedEntities()["assignment"]?.aggregatedEntity)
        .toMatchObject({ qualifier: "must" });
    });

    it("Removes the assignment from the result when it is deleted.", () => {
      let notifyModel: (changes: EntityChange[]) => void = () => { };
      const assignment = assignmentFixture({ id: "assignment", classProfile: "profile" });
      const model = createModel("profile-model", [
        classProfileFixture({ id: "profile", controlledVocabularies: ["assignment"] }),
        assignment,
      ]);
      model.subscribeToChanges = callback => { notifyModel = callback; };
      const aggregator = new ApplicationProfileAggregator(
        model, new VocabularyAggregator(createModel("vocabulary-model", [])));

      notifyModel([{ previous: assignment, next: null }]);

      expect(aggregator.getAggregatedEntities()["assignment"]).toBeUndefined();
    });

  });

});
