import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addDiagramNode,
  addNode,
  createAttribute,
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
} from "../operation-test-utilities";

describe("updateVisualNodeContent", () => {

  test("Content is replaced.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const first = await createAttribute(context, a, "first");
    const second = await createAttribute(context, a, "second");
    const node = addNode(context, a, { content: [first] });

    await run(context, cmeOperations.updateVisualNodeContent.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualNode: node,
      content: [second, first],
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([second, first]);
  });

  test("Diagram node has no content and fails.", async () => {
    const context = createOperationTestContext();
    const diagramNode = addDiagramNode(context, context.otherVisualModel.getId());

    const result = await context.executor.execute(
      cmeOperations.updateVisualNodeContent.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualNode: diagramNode,
        content: [],
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
  });

});
