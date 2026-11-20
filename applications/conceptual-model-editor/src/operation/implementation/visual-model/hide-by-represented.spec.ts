import { describe, expect, test } from "vitest";
import { isVisualGroup } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("hideByRepresented", () => {

  test("Hide by represented removes all visuals of the entity.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const first = addNode(context, a);
    const second = addNode(context, a);
    const other = addNode(context, b);
    addEdge(context, ab, first, other);
    addEdge(context, ab, second, other);

    await run(context, cmeOperations.hideByRepresented.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [a],
    }));

    expect(context.visualModel.hasVisualEntityForRepresented(a)).toBe(false);
    // Edges without an end are removed too.
    expect(visualRelationships(context.visualModel)).toHaveLength(0);
    expect(context.visualModel.getVisualEntity(other)).not.toBeNull();
  });

  test("Hiding a relationship keeps its ends.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    addEdge(context, ab, nodeA, nodeB);

    await run(context, cmeOperations.hideByRepresented.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [ab],
    }));

    expect(visualRelationships(context.visualModel)).toHaveLength(0);
    expect(context.visualModel.getVisualEntity(nodeA)).not.toBeNull();
    expect(context.visualModel.getVisualEntity(nodeB)).not.toBeNull();
  });

  test("Group without content is removed.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const c = await createClass(context, "c");
    const nodeC = addNode(context, c);
    const group = context.visualModel.addVisualGroup({
      content: [addNode(context, a), addNode(context, b)],
      anchored: null,
    });

    await run(context, cmeOperations.hideByRepresented.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [a, b],
    }));

    expect(context.visualModel.getVisualEntity(group)).toBeNull();
    expect([...context.visualModel.getVisualEntities().values()]
      .some(isVisualGroup)).toBe(false);
    expect(context.visualModel.getVisualEntity(nodeC)).not.toBeNull();
  });

});
