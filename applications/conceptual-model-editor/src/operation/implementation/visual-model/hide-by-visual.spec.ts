import { describe, expect, test } from "vitest";
import { VisualGroup } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("hideByVisual", () => {

  test("Hide by visual removes connected edges.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    addEdge(context, ab, nodeA, nodeB);

    await run(context, cmeOperations.hideByVisual.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [nodeA],
    }));

    expect(context.visualModel.getVisualEntity(nodeA)).toBeNull();
    expect(visualRelationships(context.visualModel)).toHaveLength(0);
    expect(context.visualModel.getVisualEntity(nodeB)).not.toBeNull();
  });

  test("Hiding one of duplicated nodes keeps the other with its edge.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const first = addNode(context, a);
    const second = addNode(context, a);
    const nodeB = addNode(context, b);
    addEdge(context, ab, first, nodeB);
    const kept = addEdge(context, ab, second, nodeB);

    await run(context, cmeOperations.hideByVisual.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [first],
    }));

    expect(context.visualModel.getVisualEntity(first)).toBeNull();
    expect(context.visualModel.getVisualEntity(second)).not.toBeNull();
    expect(visualRelationships(context.visualModel).map(item => item.id)).toEqual([kept]);
  });

  test("Hidden node is removed from its group.", async () => {
    const context = createOperationTestContext();
    const [a, b, c] = await Promise.all(
      ["a", "b", "c"].map(name => createClass(context, name)));
    const [nodeA, nodeB, nodeC] = [a, b, c].map(item => addNode(context, item));
    const group = context.visualModel.addVisualGroup({
      content: [nodeA, nodeB, nodeC],
      anchored: null,
    });

    await run(context, cmeOperations.hideByVisual.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [nodeA],
    }));

    const content = (context.visualModel.getVisualEntity(group) as VisualGroup).content;
    expect(content).toEqual([nodeB, nodeC]);
  });

});
