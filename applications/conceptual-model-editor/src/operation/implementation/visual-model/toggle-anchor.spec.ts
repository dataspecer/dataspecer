import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
  showClass,
} from "../operation-test-utilities";

describe("toggleAnchor", () => {

  test("Anchor is toggled when no value is given.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    const toggle = () => run(context, cmeOperations.toggleAnchor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: node.id,
    }));

    await toggle();
    expect(getVisualNode(context.visualModel, node.id).position.anchored).toBe(true);
    await toggle();
    expect(getVisualNode(context.visualModel, node.id).position.anchored).toBe(null);
  });

});
