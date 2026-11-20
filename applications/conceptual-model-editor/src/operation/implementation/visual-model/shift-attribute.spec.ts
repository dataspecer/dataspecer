import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  createRelationship,
  getVisualNode,
  run,
  showClass,
  STRING_RANGE,
} from "../operation-test-utilities";

describe("shiftAttribute", () => {

  test("Shifting the first attribute up wraps around to the end.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const attributes = [
      await createRelationship(context, first, STRING_RANGE, "a"),
      await createRelationship(context, first, STRING_RANGE, "b"),
    ];
    // Showing the class adds the attributes as content.
    const node = await showClass(context, first, 0);
    expect(node.content).toEqual(attributes);

    await run(context, cmeOperations.shiftAttribute.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node.id,
      attribute: attributes[0],
      shift: -1,
    }));
    expect(getVisualNode(context.visualModel, node.id).content)
      .toEqual([attributes[1], attributes[0]]);
  });

});
