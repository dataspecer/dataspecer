import { describe, expect, test } from "vitest";
import { VisualRelationship } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("addWaypoint", () => {

  test("Waypoint is inserted at the index.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const edge = addEdge(context, ab, addNode(context, a), addNode(context, b), {
      waypoints: [
        { x: 0, y: 0, anchored: null },
        { x: 20, y: 20, anchored: null },
      ],
    });

    await run(context, cmeOperations.addWaypoint.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEdge: edge,
      index: 1,
      x: 10,
      y: 10,
    }));

    const waypoints = (context.visualModel.getVisualEntity(edge) as VisualRelationship).waypoints;
    expect(waypoints.map(item => item.x)).toEqual([0, 10, 20]);
  });

  test("Waypoint can not be added to a node.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.addWaypoint.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualEdge: node,
        index: 0,
        x: 10,
        y: 10,
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
  });

});
