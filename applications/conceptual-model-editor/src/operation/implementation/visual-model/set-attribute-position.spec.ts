import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { InvalidOperationArguments } from "../../operation";
import {
  addNode,
  createAttribute,
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
} from "../operation-test-utilities";

describe("setAttributePosition", () => {

  test("Attribute moves to the position.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const first = await createAttribute(context, a, "first");
    const second = await createAttribute(context, a, "second");
    const third = await createAttribute(context, a, "third");
    const node = addNode(context, a, { content: [first, second, third] });

    await run(context, cmeOperations.setAttributePosition.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node,
      attribute: third,
      position: 0,
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([third, first, second]);
  });

  test("Position outside of the content fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const first = await createAttribute(context, a, "first");
    const node = addNode(context, a, { content: [first] });

    const result = await context.executor.execute(
      cmeOperations.setAttributePosition.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualNode: node,
        attribute: first,
        position: 1,
      }));

    expect(result.exception).toBeInstanceOf(InvalidOperationArguments);
  });

  test("Attribute not in the node fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const first = await createAttribute(context, a, "first");
    const hidden = await createAttribute(context, a, "hidden");
    const node = addNode(context, a, { content: [first] });

    const result = await context.executor.execute(
      cmeOperations.setAttributePosition.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualNode: node,
        attribute: hidden,
        position: 0,
      }));

    expect(result.exception).toBeInstanceOf(InvalidOperationArguments);
    expect(getVisualNode(context.visualModel, node).content).toEqual([first]);
  });

});
