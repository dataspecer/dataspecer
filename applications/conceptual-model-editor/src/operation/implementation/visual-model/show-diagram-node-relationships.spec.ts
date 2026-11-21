import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addDiagramNode,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("showDiagramNodeRelationships", () => {

  test("Edges between the diagram node and outer nodes are added once.", async () => {
    const context = createOperationTestContext();
    const outerA = await createClass(context, "outer-a");
    const outerB = await createClass(context, "outer-b");
    const innerA = await createClass(context, "inner-a");
    const innerB = await createClass(context, "inner-b");
    const outgoing = await createRelationship(context, outerB, innerA, "outgoing");
    const incoming = await createRelationship(context, innerB, outerA, "incoming");
    const nodeA = addNode(context, outerA);
    const nodeB = addNode(context, outerB);
    const inner = context.otherVisualModel;
    addNode(context, innerA, { visualModel: inner });
    addNode(context, innerB, { visualModel: inner });
    const diagramNode = addDiagramNode(context, inner.getId());
    const show = () => run(context, cmeOperations.showDiagramNodeRelationships.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualDiagramNode: diagramNode,
    }));
    const edges = () => visualRelationships(context.visualModel)
      .map(item => [item.representedRelationship, item.visualSource, item.visualTarget]);

    await show();
    expect(edges()).toHaveLength(2);
    expect(edges()).toContainEqual([outgoing, nodeB, diagramNode]);
    expect(edges()).toContainEqual([incoming, diagramNode, nodeA]);
    // The referenced visual model is not changed.
    expect(visualRelationships(inner)).toHaveLength(0);

    await show();
    expect(edges()).toHaveLength(2);
  });

  test("Removed edge is added back.", async () => {
    const context = createOperationTestContext();
    const outer = await createClass(context, "outer");
    const inner = await createClass(context, "inner");
    const relationship = await createRelationship(context, outer, inner, "outer-inner");
    const outerNode = addNode(context, outer);
    addNode(context, inner, { visualModel: context.otherVisualModel });
    const diagramNode = addDiagramNode(context, context.otherVisualModel.getId());
    const show = () => run(context, cmeOperations.showDiagramNodeRelationships.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualDiagramNode: diagramNode,
    }));

    await show();
    context.visualModel.deleteVisualEntity(visualRelationships(context.visualModel)[0].id);
    await show();

    const edges = visualRelationships(context.visualModel);
    expect(edges).toHaveLength(1);
    expect(edges[0].representedRelationship).toBe(relationship);
    expect(edges[0].visualSource).toBe(outerNode);
    expect(edges[0].visualTarget).toBe(diagramNode);
  });

  test("Visual node is not a diagram node and fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.showDiagramNodeRelationships.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualDiagramNode: node,
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
  });

});
