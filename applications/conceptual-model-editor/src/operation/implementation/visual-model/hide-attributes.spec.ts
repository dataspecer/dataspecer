import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  addNode,
  createAttribute,
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
} from "../operation-test-utilities";

describe("hideAttributes", () => {

  test("With a visual node only that node changes.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const first = await createAttribute(context, a, "first");
    const second = await createAttribute(context, a, "second");
    const node = addNode(context, a, { content: [first, second] });
    const copy = addNode(context, a, { content: [first, second] });

    await run(context, cmeOperations.hideAttributes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      attributes: [first],
      visualNode: node,
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([second]);
    expect(getVisualNode(context.visualModel, copy).content).toEqual([first, second]);
  });

  test("Without a visual node all nodes of the domain change.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const attributeA = await createAttribute(context, a, "a-attribute");
    const attributeB = await createAttribute(context, b, "b-attribute");
    const node = addNode(context, a, { content: [attributeA] });
    const copy = addNode(context, a, { content: [attributeA] });
    const other = addNode(context, b, { content: [attributeB] });

    await run(context, cmeOperations.hideAttributes.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      attributes: [attributeA],
      visualNode: null,
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([]);
    expect(getVisualNode(context.visualModel, copy).content).toEqual([]);
    expect(getVisualNode(context.visualModel, other).content).toEqual([attributeB]);
  });

});
