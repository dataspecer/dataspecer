import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import type { Entity } from "../../entity-model/entity.ts";
import { InMemoryEntityModel } from "../../entity-model/index.ts";
import { assignmentFixture, classProfileFixture } from "../profile/test-fixtures.ts";
import type { AggregatedProfiledSemanticModelClass } from "../profile/aggregator/index.ts";
import { SemanticModelAggregator } from "./aggregator.ts";

/**
 * The aggregator is stateful. It is not called with entities to aggregate,
 * instead it observes entity models and computes the aggregation from what the models report. 
 * This helper only does setup, all the aggregation is done by {@link SemanticModelAggregator}.
 *
 * @returns Aggregated entities by their identifier.
 */
function getAggregatedEntities(entities: Entity[]) {
  const model = new InMemoryEntityModel();
  model.change(
    Object.fromEntries(entities.map(entity => [entity.id, entity])),
    []);
  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(model);
  return aggregator.getView().getEntities();
}

function controlledVocabulariesOf(
  entities: ReturnType<typeof getAggregatedEntities>, id: string,
): string[] {
  const aggregated = entities[id]?.aggregatedEntity as
    AggregatedProfiledSemanticModelClass;
  return aggregated.controlledVocabularies ?? [];
}

describe("SemanticModelAggregator", () => {

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Passes a controlled vocabulary through as it is, without a warning.", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const vocabulary: ControlledVocabulary = {
      ...DEFAULT_CONTROLLED_VOCABULARY,
      id: "cv-1",
      title: "Vocabulary",
    };
    const actual = getAggregatedEntities([vocabulary])[vocabulary.id];

    expect(actual?.aggregatedEntity).toStrictEqual(vocabulary);
    expect(actual?.sources).toStrictEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

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

    it("Has only the profiled entities as sources, not the assignments.", () => {
      const entities = getAggregatedEntities([
        classProfileFixture({ id: "parent" }),
        classProfileFixture({
          id: "child", profiling: ["parent"], controlledVocabularies: ["child-assignment"],
        }),
        assignmentFixture({ id: "child-assignment", classProfile: "child" }),
      ]);
      expect(entities["child"]?.sources.map(source => source.id))
        .toStrictEqual(["parent"]);
    });

  });

});
