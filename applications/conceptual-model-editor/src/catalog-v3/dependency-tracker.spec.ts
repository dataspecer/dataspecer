import { it, describe, expect } from "vitest";

import { Entity } from "@dataspecer/entity-model";

import { DependencyTracker } from "./dependency-tracker";

interface TestEntity extends Entity {

  value: number;

  dependencies: string[];

}

describe("DependencyTracker", () => {

  it("Derive sum of numbers.", () => {

    const values: Record<string, number> = {};

    const dependencyTracker = new DependencyTracker([{
      dependencies(entity) {
        return (entity as TestEntity).dependencies;
      },
      onEntityDidCreate(_, entity) {
        values[entity!.id] = (entity as TestEntity)
          .dependencies.map(item => values[item] ?? 0)
          .reduce((prev, next) => prev + next, (entity as TestEntity).value);
      },
      onEntityDidChange(_model, _prev, next) {
        values[next!.id] = (next as TestEntity)
          .dependencies.map(item => values[item] ?? 0)
          .reduce((prev, next) => prev + next, (next as TestEntity).value);
      },
      onDependenciesDidChange(entity) {
        // We need to recompute.
        values[entity.id] = (entity as TestEntity)
          .dependencies.map(item => values[item] ?? 0)
          .reduce((prev, next) => prev + next, (entity as TestEntity).value);
      },
    }]);

    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [
          // We use order in which there is a dependency.
          { id: "0", type: [], value: 0, dependencies: [] },
          { id: "1", type: [], value: 1, dependencies: ["0"] },
        ] as TestEntity[],
        updated: [],
        deleted: []
      }
    });
    expect(values["0"]).toBe(0);
    expect(values["1"]).toBe(1);

    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [
          // We use reverse order here as the dependencies may not be in order.
          // Also we include one from multiple dependencies.
          { id: "6", type: [], value: 0, dependencies: ["1", "2", "3"] },
          { id: "3", type: [], value: 1, dependencies: ["2"] },
          { id: "2", type: [], value: 1, dependencies: ["1"] },
        ] as TestEntity[],
        updated: [],
        deleted: []
      }
    });
    expect(values["0"]).toBe(0);
    expect(values["1"]).toBe(1);
    expect(values["2"]).toBe(2);
    expect(values["3"]).toBe(3);
    expect(values["6"]).toBe(6);

    // Change zero .. this should shift all.
    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [],
        updated: [
          { id: "0", type: [], value: 1, dependencies: [] }
        ] as TestEntity[],
        deleted: []
      }
    });

    expect(values["0"]).toBe(1);
    expect(values["1"]).toBe(2);
    expect(values["2"]).toBe(3);
    expect(values["3"]).toBe(4);
    expect(values["6"]).toBe(9);
  });

  it("Cycle of dependencies created at once.", () => {

    const updateCounter: Record<string, number> = {};

    const dependencyTracker = new DependencyTracker([{
      dependencies(entity) {
        return (entity as TestEntity).dependencies;
      },
      onEntityDidChange() {
        // We do not have to do anything here,
        // as we will be notified in the via the dependency change method.
      },
      onDependenciesDidChange(entity) {
        // We need to recompute.
        updateCounter[entity.id] = (updateCounter[entity.id] ?? 0) + 1;
      },
    }]);

    // 0 -> 1 -> 2 -> 0
    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [
          { id: "0", type: [], value: 0, dependencies: ["1"] },
          { id: "1", type: [], value: 1, dependencies: ["2"] },
          { id: "2", type: [], value: 1, dependencies: ["0"] },
        ] as TestEntity[],
        updated: [],
        deleted: []
      }
    });

    // There is no call of an update as there is a cycle.
    expect(updateCounter).toStrictEqual({});
  });

  it("Introduced cycle of dependencies.", () => {

    const updateCounter: Record<string, number> = {};

    const dependencyTracker = new DependencyTracker([{
      dependencies(entity) {
        return (entity as TestEntity).dependencies;
      },
      onEntityDidChange() {
        // We do not have to do anything here,
        // as we will be notified in the via the dependency change method.
      },
      onDependenciesDidChange(entity) {
        // We need to recompute.
        updateCounter[entity.id] = (updateCounter[entity.id] ?? 0) + 1;
      },
    }]);

    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [
          { id: "0", type: [], value: 0, dependencies: ["1"] },
          { id: "2", type: [], value: 1, dependencies: ["0"] },
        ] as TestEntity[],
        updated: [],
        deleted: [],
      }
    });

    // There should be one update of 2 as it depends on zero.
    expect(updateCounter).toStrictEqual({ "2": 1 });
    // Reset counter;
    updateCounter["2"] = 0;

    // Create a cycle.
    // 0 -> 1 -> 2 -> 0
    dependencyTracker.onEntitiesDidChange({
      "m": {
        created: [
          { id: "1", type: [], value: 1, dependencies: ["2"] },
        ] as TestEntity[],
        updated: [],
        deleted: [],
      }
    });

    // Each entity should be updated at least once
    expect(updateCounter).toStrictEqual({ "0": 1, "1": 1, "2": 1 });

  });

});
