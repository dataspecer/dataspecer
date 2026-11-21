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

describe("showAttribute", () => {

  test("Attributes are added to the nodes of the domain.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const node = await showClass(context, first, 0);
    // Create the attributes after the node, so showing the class
    // does not add them on its own.
    const attributes = [
      await createRelationship(context, first, STRING_RANGE, "a"),
      await createRelationship(context, first, STRING_RANGE, "b"),
    ];
    expect(getVisualNode(context.visualModel, node.id).content).toEqual([]);

    for (const attribute of attributes) {
      await run(context, cmeOperations.showAttribute.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        attribute,
        visualNode: null,
        position: null,
      }));
    }
    expect(getVisualNode(context.visualModel, node.id).content).toEqual(attributes);
  });

});
