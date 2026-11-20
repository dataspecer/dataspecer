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

describe("layoutVisualModel", () => {

  test("Anchored nodes keep their position.", { timeout: 30_000 }, async () => {
    const context = createOperationTestContext();
    const [a, b, c] = await Promise.all(
      ["a", "b", "c"].map(name => createClass(context, name)));
    const ab = await createRelationship(context, a, b, "a-b");
    const bc = await createRelationship(context, b, c, "b-c");
    // All nodes at the same place, only the last one is not anchored.
    const position = { x: 10000, y: 10000, anchored: true as const };
    const [nodeA, nodeB, nodeC] = [a, b, c].map(item => addNode(context, item));
    context.visualModel.updateVisualEntity(nodeA, { position });
    context.visualModel.updateVisualEntity(nodeB, { position });
    context.visualModel.updateVisualEntity(nodeC, { position: { ...position, anchored: null } });
    addEdge(context, ab, nodeA, nodeB);
    addEdge(context, bc, nodeB, nodeC);
    const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
    configuration.chosenMainAlgorithm = "elk_stress";
    configuration.main.elk_stress.run_node_overlap_removal_after = false;
    configuration.main.elk_stress.interactive = true;
    configuration.main.elk_stress.stress_edge_len = 500;

    await run(context, cmeOperations.layoutVisualModel.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      configuration,
    }));

    expect(getVisualNode(context.visualModel, nodeA).position).toEqual(position);
    expect(getVisualNode(context.visualModel, nodeB).position).toEqual(position);
    expect(getVisualNode(context.visualModel, nodeC).position).not.toEqual(
      { ...position, anchored: null });
  });

});
