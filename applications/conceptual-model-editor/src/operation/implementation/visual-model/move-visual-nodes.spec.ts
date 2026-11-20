import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
  showClass,
} from "../operation-test-utilities";

describe("moveVisualNodes", () => {

  test("Move nodes keeps anchors.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    await run(context, cmeOperations.toggleAnchor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: node.id,
      anchored: true,
    }));

    await run(context, cmeOperations.moveVisualNodes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      positions: { [node.id]: { x: 10, y: 20 } },
    }));
    expect(getVisualNode(context.visualModel, node.id).position)
      .toEqual({ x: 10, y: 20, anchored: true });
  });

});
