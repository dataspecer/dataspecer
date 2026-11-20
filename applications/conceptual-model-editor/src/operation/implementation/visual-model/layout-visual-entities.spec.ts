import { describe, expect, test } from "vitest";
import { getDefaultUserGivenAlgorithmConfigurationsFull } from "@dataspecer/layout";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  getVisualNode,
  run,
} from "../operation-test-utilities";

describe("layoutVisualEntities", () => {

  test("Only the given entities move.", { timeout: 30_000 }, async () => {
    const context = createOperationTestContext();
    const [a, b, outside] = await Promise.all(
      ["a", "b", "outside"].map(name => createClass(context, name)));
    const ab = await createRelationship(context, a, b, "a-b");
    // Both selected nodes at the same place, so the layout has to move them.
    const nodeA = addNode(context, a, { x: 0, y: 0 });
    const nodeB = addNode(context, b, { x: 0, y: 0 });
    const outsideNode = addNode(context, outside, { x: 50, y: 50 });
    addEdge(context, ab, nodeA, nodeB);
    const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
    configuration.chosenMainAlgorithm = "elk_stress";
    configuration.main.elk_stress.stress_edge_len = 500;

    await run(context, cmeOperations.layoutVisualEntities.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [nodeA, nodeB],
      configuration,
    }));

    const positionA = getVisualNode(context.visualModel, nodeA).position;
    const positionB = getVisualNode(context.visualModel, nodeB).position;
    expect(positionA).not.toEqual(positionB);
    expect(getVisualNode(context.visualModel, outsideNode).position)
      .toEqual({ x: 50, y: 50, anchored: null });
  });

});
