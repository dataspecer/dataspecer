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

describe("deleteWaypoint", () => {

  test("Waypoint at the index is removed.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const edge = addEdge(context, ab, addNode(context, a), addNode(context, b), {
      waypoints: [
        { x: 0, y: 0, anchored: null },
        { x: 10, y: 10, anchored: null },
        { x: 20, y: 20, anchored: null },
      ],
    });

    await run(context, cmeOperations.deleteWaypoint.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEdge: edge,
      index: 1,
    }));

    const waypoints = (context.visualModel.getVisualEntity(edge) as VisualRelationship).waypoints;
    expect(waypoints.map(item => item.x)).toEqual([0, 20]);
  });

});
