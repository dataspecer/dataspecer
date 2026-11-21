import { describe, expect, test } from "vitest";
import { VisualNode, VisualRelationship } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { CmeOperationExecutionFailed } from "../../operation";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("setVisualEntityColor", () => {

  test("Sets color of a node and an edge.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    const edge = addEdge(context, ab, nodeA, nodeB);

    await run(context, cmeOperations.setVisualEntityColor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [nodeA, edge],
      color: "#ff0000",
    }));

    const visualModel = context.visualModel;
    expect((visualModel.getVisualEntity(nodeA) as VisualNode).color).toBe("#ff0000");
    expect((visualModel.getVisualEntity(edge) as VisualRelationship).color).toBe("#ff0000");
    expect((visualModel.getVisualEntity(nodeB) as VisualNode).color ?? null).toBeNull();
  });

  test("Null resets the color.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);
    const setColor = (color: string | null) => run(context,
      cmeOperations.setVisualEntityColor.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualEntities: [node],
        color,
      }));

    await setColor("#00ff00");
    await setColor(null);

    expect((context.visualModel.getVisualEntity(node) as VisualNode).color ?? null).toBeNull();
  });

  test("Missing entity fails and changes nothing.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.setVisualEntityColor.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualEntities: [node, "missing"],
        color: "#ff0000",
      }));

    expect(result.exception).toBeInstanceOf(CmeOperationExecutionFailed);
    expect((context.visualModel.getVisualEntity(node) as VisualNode).color ?? null).toBeNull();
  });

});
