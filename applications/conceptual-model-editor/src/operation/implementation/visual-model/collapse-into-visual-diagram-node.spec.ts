import { describe, expect, test } from "vitest";
import { isVisualDiagramNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidOperationArguments } from "../../operation";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("collapseIntoVisualDiagramNode", () => {

  test("Selection moves to the visual model, crossing edges are rerouted.", async () => {
    const context = createOperationTestContext();
    // Cycle a -> b -> c -> d -> a, we collapse a and b.
    const [a, b, c, d] = await Promise.all(
      ["a", "b", "c", "d"].map(name => createClass(context, name)));
    const ab = await createRelationship(context, a, b, "a-b");
    const bc = await createRelationship(context, b, c, "b-c");
    const cd = await createRelationship(context, c, d, "c-d");
    const da = await createRelationship(context, d, a, "d-a");
    const [nodeA, nodeB, nodeC, nodeD] = [a, b, c, d].map(item => addNode(context, item));
    const edgeAB = addEdge(context, ab, nodeA, nodeB);
    const edgeBC = addEdge(context, bc, nodeB, nodeC);
    const edgeCD = addEdge(context, cd, nodeC, nodeD);
    const edgeDA = addEdge(context, da, nodeD, nodeA);
    const inner = context.otherVisualModel;

    const result = await run(context, cmeOperations.collapseIntoVisualDiagramNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      representedVisualModel: inner.getId(),
      visualNodes: [nodeA, nodeB],
      visualEdges: [edgeAB, edgeBC],
      x: 0,
      y: 0,
    }));

    const visualModel = context.visualModel;
    const diagramNode = visualModel.getVisualEntity(result.created);
    expect(diagramNode !== null && isVisualDiagramNode(diagramNode)).toBe(true);
    expect(visualModel.getVisualEntity(nodeA)).toBeNull();
    expect(visualModel.getVisualEntity(nodeB)).toBeNull();
    expect(visualModel.getVisualEntity(edgeAB)).toBeNull();
    expect(visualModel.getVisualEntity(edgeBC)).toMatchObject(
      { visualSource: result.created, visualTarget: nodeC });
    expect(visualModel.getVisualEntity(edgeDA)).toMatchObject(
      { visualSource: nodeD, visualTarget: result.created });
    expect(visualModel.getVisualEntity(edgeCD)).toMatchObject(
      { visualSource: nodeC, visualTarget: nodeD });
    // Only the edge with both ends in the selection is copied.
    expect(inner.hasVisualEntityForRepresented(a)).toBe(true);
    expect(inner.hasVisualEntityForRepresented(b)).toBe(true);
    expect(visualRelationships(inner).map(item => item.representedRelationship)).toEqual([ab]);
  });

  test("Collapsing into the same visual model fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.collapseIntoVisualDiagramNode.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        representedVisualModel: context.visualModel.getId(),
        visualNodes: [node],
        visualEdges: [],
        x: 0,
        y: 0,
      }));

    expect(result.exception).toBeInstanceOf(InvalidOperationArguments);
    expect(context.visualModel.getVisualEntity(node)).not.toBeNull();
  });

});
