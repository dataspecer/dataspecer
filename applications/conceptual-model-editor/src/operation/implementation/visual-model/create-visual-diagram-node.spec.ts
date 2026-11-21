import { describe, expect, test } from "vitest";
import { isVisualDiagramNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidOperationArguments } from "../../operation";
import {
  addDiagramNode,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("createVisualDiagramNode", () => {

  test("Node references the visual model.", async () => {
    const context = createOperationTestContext();

    const result = await run(context, cmeOperations.createVisualDiagramNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      representedVisualModel: context.otherVisualModel.getId(),
      x: 10,
      y: 20,
    }));

    const node = context.visualModel.getVisualEntity(result.created);
    expect(node !== null && isVisualDiagramNode(node)).toBe(true);
    if (node !== null && isVisualDiagramNode(node)) {
      expect(node.representedVisualModel).toBe(context.otherVisualModel.getId());
      expect(node.position).toEqual({ x: 10, y: 20, anchored: null });
    }
  });

  test("Referencing the visual model itself fails.", async () => {
    const context = createOperationTestContext();

    const result = await context.executor.execute(
      cmeOperations.createVisualDiagramNode.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        representedVisualModel: context.visualModel.getId(),
        x: 0,
        y: 0,
      }));

    expect(result.exception).toBeInstanceOf(InvalidOperationArguments);
  });

  test("Creating a cycle through another visual model fails.", async () => {
    const context = createOperationTestContext();
    // The other visual model already contains the visual model.
    addDiagramNode(context, context.visualModel.getId(),
      { visualModel: context.otherVisualModel });

    const result = await context.executor.execute(
      cmeOperations.createVisualDiagramNode.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        representedVisualModel: context.otherVisualModel.getId(),
        x: 0,
        y: 0,
      }));

    expect(result.exception).toBeInstanceOf(InvalidOperationArguments);
    expect(context.visualModel.getVisualEntities().size).toBe(0);
  });

});
