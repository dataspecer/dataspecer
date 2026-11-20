import { describe, expect, test } from "vitest";
import { VisualRelationship } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("moveWaypoints", () => {

  test("Only given waypoints move, anchors are kept.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const edge = addEdge(context, ab, addNode(context, a), addNode(context, b), {
      waypoints: [
        { x: 0, y: 0, anchored: null },
        { x: 10, y: 10, anchored: true },
      ],
    });

    await run(context, cmeOperations.moveWaypoints.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      positions: { [edge]: { 1: { x: 50, y: 60 } } },
    }));

    const waypoints = (context.visualModel.getVisualEntity(edge) as VisualRelationship).waypoints;
    expect(waypoints).toEqual([
      { x: 0, y: 0, anchored: null },
      { x: 50, y: 60, anchored: true },
    ]);
  });

});
