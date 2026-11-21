import { describe, expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addDiagramNode,
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("dissolveVisualDiagramNode", () => {

  test("Content is copied back and edges are rerouted.", async () => {
    const context = createOperationTestContext();
    const outer = await createClass(context, "outer");
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const outerA = await createRelationship(context, outer, a, "outer-a");
    const inner = context.otherVisualModel;
    const innerA = addNode(context, a, { visualModel: inner, x: 0, y: 0 });
    const innerB = addNode(context, b, { visualModel: inner, x: 200, y: 0 });
    addEdge(context, ab, innerA, innerB, { visualModel: inner });
    const outerNode = addNode(context, outer, { x: -1000, y: 0 });
    const diagramNode = addDiagramNode(context, inner.getId(), { x: 500, y: 500 });
    const crossing = addEdge(context, outerA, outerNode, diagramNode);

    await run(context, cmeOperations.dissolveVisualDiagramNode.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualDiagramNode: diagramNode,
    }));

    const visualModel = context.visualModel;
    expect(visualModel.getVisualEntity(diagramNode)).toBeNull();
    const [copyA] = visualModel.getVisualEntitiesForRepresented(a) as VisualNode[];
    expect(copyA).toBeDefined();
    expect(visualModel.hasVisualEntityForRepresented(b)).toBe(true);
    expect(visualModel.getVisualEntity(crossing)).toMatchObject(
      { visualSource: outerNode, visualTarget: copyA.id });
    expect(visualRelationships(visualModel).map(item => item.representedRelationship))
      .toEqual(expect.arrayContaining([ab, outerA]));
    // The referenced visual model is not changed.
    expect(inner.getVisualEntities().size).toBe(3);
  });

  test("Visual node is not a diagram node and fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.dissolveVisualDiagramNode.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualDiagramNode: node,
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
    expect(context.visualModel.getVisualEntity(node)).not.toBeNull();
  });

});
