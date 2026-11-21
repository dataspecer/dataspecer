import { describe, expect, test } from "vitest";
import { isVisualNode, VisualNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  showClass,
  visualRelationships,
} from "../operation-test-utilities";

describe("duplicateVisualNode", () => {

  test("Duplicate node copies its edges.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await createRelationship(context, first, second, "rel");
    const firstNode = await showClass(context, first, 0);
    // Showing the second class adds the relationship edge.
    await showClass(context, second, 500);
    expect(visualRelationships(context.visualModel).length).toBe(1);

    const result = await run(context, cmeOperations.duplicateVisualNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: firstNode.id,
      nodeDimensions: { [firstNode.id]: { width: 200, height: 50 } },
    }));
    const duplicate = context.visualModel.getVisualEntity(result.created);
    expect(duplicate !== null && isVisualNode(duplicate)).toBe(true);
    expect((duplicate as VisualNode).position.x).toBeLessThan(firstNode.position.x);
    const edges = visualRelationships(context.visualModel);
    expect(edges.length).toBe(2);
    expect(edges.some(edge => edge.visualSource === result.created)).toBe(true);
  });

  test("Duplicate of a node with a self loop gets its own self loop.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const aa = await createRelationship(context, a, a, "a-a");
    const node = addNode(context, a);
    addEdge(context, aa, node, node);

    const result = await run(context, cmeOperations.duplicateVisualNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node,
    }));

    const edges = visualRelationships(context.visualModel)
      .map(item => [item.visualSource, item.visualTarget]);
    expect(edges).toHaveLength(2);
    expect(edges).toContainEqual([node, node]);
    expect(edges).toContainEqual([result.created, result.created]);
  });

});
