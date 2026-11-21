import { describe, expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  showClass,
  visualRelationships,
} from "../operation-test-utilities";

describe("copyVisualEntities", () => {

  test("Copy visual entities copies only edges with both ends.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await createRelationship(context, first, second, "rel");
    const firstNode = await showClass(context, first, 0);
    // Showing the second class adds the relationship edge.
    await showClass(context, second, 500);
    const edge = visualRelationships(context.visualModel)[0];

    const result = await run(context, cmeOperations.copyVisualEntities.create(context.createContext, {
      sourceVisualModel: context.visualModel.getId(),
      targetVisualModel: context.otherVisualModel.getId(),
      visualNodes: [firstNode.id],
      visualEdges: [edge.id],
    }));
    expect(result.mapping[edge.id]).toBeUndefined();
    expect(context.otherVisualModel.hasVisualEntityForRepresented(first)).toBe(true);
    expect(visualRelationships(context.otherVisualModel).length).toBe(0);
  });

  test("Custom color is part of the copy.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    await run(context, cmeOperations.setVisualEntityColor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [node.id],
      color: "#ff0000",
    }));

    await run(context, cmeOperations.copyVisualEntities.create(context.createContext, {
      sourceVisualModel: context.visualModel.getId(),
      targetVisualModel: context.otherVisualModel.getId(),
      visualNodes: [node.id],
      visualEdges: [],
    }));
    const copy = context.otherVisualModel
      .getVisualEntitiesForRepresented(first)[0] as VisualNode;
    expect(copy.color).toBe("#ff0000");
  });

});
