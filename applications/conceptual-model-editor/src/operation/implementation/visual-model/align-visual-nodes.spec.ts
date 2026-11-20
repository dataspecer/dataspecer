import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  addNode,
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
} from "../operation-test-utilities";

describe("alignVisualNodes", () => {

  test("Horizontal start moves nodes to the leftmost x.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const nodeA = addNode(context, a, { x: 100, y: 0 });
    const nodeB = addNode(context, b, { x: 300, y: 200 });

    await run(context, cmeOperations.alignVisualNodes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNodes: [nodeA, nodeB],
      direction: "horizontal",
      alignment: "start",
    }));

    expect(getVisualNode(context.visualModel, nodeA).position).toMatchObject({ x: 100, y: 0 });
    expect(getVisualNode(context.visualModel, nodeB).position).toMatchObject({ x: 100, y: 200 });
  });

  test("Vertical end aligns the bottom edges using node dimensions.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const nodeA = addNode(context, a, { x: 0, y: 0 });
    const nodeB = addNode(context, b, { x: 300, y: 100 });

    await run(context, cmeOperations.alignVisualNodes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNodes: [nodeA, nodeB],
      direction: "vertical",
      alignment: "end",
      nodeDimensions: {
        [nodeA]: { width: 100, height: 200 },
        [nodeB]: { width: 100, height: 50 },
      },
    }));

    // The bottom edge is at 200, the larger of 0 + 200 and 100 + 50.
    expect(getVisualNode(context.visualModel, nodeA).position).toMatchObject({ x: 0, y: 0 });
    expect(getVisualNode(context.visualModel, nodeB).position).toMatchObject({ x: 300, y: 150 });
  });

});
