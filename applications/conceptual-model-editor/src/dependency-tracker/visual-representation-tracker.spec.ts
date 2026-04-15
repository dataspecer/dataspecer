import { EntityIdentifier } from "@dataspecer/entity-model";
import { it, describe, expect } from "vitest";
import {
  createVisualRepresentationTracker,
  VisualRepresentationEntry,
} from "./visual-representation-tracker";
import { createDependencyTracker } from "./dependency-tracker";
import { VisualEntity } from "@dataspecer/visual-model";

describe("createVisualRepresentationTracker", () => {

  it("Create and remove visual representant.", () => {

    const entities: Record<EntityIdentifier, VisualRepresentationEntry> = {}

    const representativeTracker = createVisualRepresentationTracker(
      (identifier) => {
        let entity = entities[identifier];
        if (entity === undefined) {
          entities[identifier] = { visualEntities: {} };
        }
        return entity;
      }
    );

    const tracker = createDependencyTracker([representativeTracker]);

    tracker.onEntitiesDidChange({
      "visual": {
        created: [],
        updated: [],
        deleted: [],
      },
    });

    expect(entities).toStrictEqual({});

    tracker.onEntitiesDidChange({});

    expect(entities).toStrictEqual({});

  });

});
