import { it, describe, expect } from "vitest";

import { createDependencyTracker } from "./dependency-tracker";
import {
  createSemanticGeneralizationOfTracker,
  createSemanticSpecializationOfTracker,
} from "./semantic-generalization-tracker";
import {
  createSemanticEntityTestFactory,
} from "./semantic-entity-test-factory";

describe("createSemanticGeneralizationOfTracker", () => {

  const semanticFactory = createSemanticEntityTestFactory();

  it("Create, update, remove generalization.", () => {

    const entities: Record<string, { generalizationOf: string[] }> = {};

    const tracker = createDependencyTracker([
      createSemanticGeneralizationOfTracker((identifier) => {
        entities[identifier] = entities[identifier] ?? { generalizationOf: [] };
        return entities[identifier];
      })
    ]);

    tracker.onEntitiesDidChange({
      "model": {
        created: [
          // We provide it in a different order.
          semanticFactory.generalization("gen", "parent", "child"),
          semanticFactory.class("parent", {}),
          semanticFactory.class("child", {}),
        ],
        updated: [],
        deleted: [],
      },
    });

    expect(entities["parent"].generalizationOf).toStrictEqual(["child"]);
    expect(entities["child"]).toBeUndefined();

    tracker.onEntitiesDidChange({
      "model": {
        created: [],
        updated: [
          // We change the relation.
          semanticFactory.generalization("gen", "child", "parent"),
        ],
        deleted: [],
      },
    });

    expect(entities["parent"].generalizationOf).toStrictEqual([]);
    expect(entities["child"].generalizationOf).toStrictEqual(["parent"]);

    tracker.onEntitiesDidChange({
      "model": {
        created: [],
        updated: [],
        // Finally we remove it.
        deleted: ["gen"],
      },
    });

    expect(entities["parent"].generalizationOf).toStrictEqual([]);
    expect(entities["child"].generalizationOf).toStrictEqual([]);

  });

});

describe("createSemanticSpecializationOfTracker", () => {

  const semanticFactory = createSemanticEntityTestFactory();

  it("Create, update, remove generalization.", () => {

    const entities: Record<string, { specializationOf: string[] }> = {};

    const tracker = createDependencyTracker([
      createSemanticSpecializationOfTracker((identifier) => {
        entities[identifier] = entities[identifier] ?? { specializationOf: [] };
        return entities[identifier];
      })
    ]);

    tracker.onEntitiesDidChange({
      "model": {
        created: [
          // We provide it in a different order.
          semanticFactory.generalization("gen", "parent", "child"),
          semanticFactory.class("parent", {}),
          semanticFactory.class("child", {}),
        ],
        updated: [],
        deleted: [],
      },
    });

    expect(entities["parent"]).toBeUndefined();
    expect(entities["child"].specializationOf).toStrictEqual(["parent"]);

    tracker.onEntitiesDidChange({
      "model": {
        created: [],
        updated: [
          // We change the relation.
          semanticFactory.generalization("gen", "child", "parent"),
        ],
        deleted: [],
      },
    });

    expect(entities["parent"].specializationOf).toStrictEqual(["child"]);
    expect(entities["child"].specializationOf).toStrictEqual([]);

    tracker.onEntitiesDidChange({
      "model": {
        created: [],
        updated: [],
        // Finally we remove it.
        deleted: ["gen"],
      },
    });

    expect(entities["parent"].specializationOf).toStrictEqual([]);
    expect(entities["child"].specializationOf).toStrictEqual([]);

  });

});
