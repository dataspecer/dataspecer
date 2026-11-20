import { describe, expect, test } from "vitest";
import { isVisualGroup, VisualGroup } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addNode,
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("dissolveVisualGroup", () => {

  test("Dissolving removes the group and keeps the content.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    const group = context.visualModel.addVisualGroup({ content: [nodeA, nodeB], anchored: null });

    const result = await run(context, cmeOperations.dissolveVisualGroup.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: nodeA,
    }));

    expect(result.removed).toBe(group);
    expect([...context.visualModel.getVisualEntities().values()]
      .some(isVisualGroup)).toBe(false);
    expect(context.visualModel.getVisualEntity(nodeA)).not.toBeNull();
    expect(context.visualModel.getVisualEntity(nodeB)).not.toBeNull();
  });

  test("Only the top level group is dissolved.", async () => {
    const context = createOperationTestContext();
    const [a, b, c, d] = await Promise.all(
      ["a", "b", "c", "d"].map(name => createClass(context, name)));
    const [nodeA, nodeB, nodeC, nodeD] = [a, b, c, d].map(item => addNode(context, item));
    const visualModel = context.visualModel;
    const first = visualModel.addVisualGroup({ content: [nodeA, nodeB], anchored: null });
    const second = visualModel.addVisualGroup({ content: [nodeC, nodeD], anchored: null });
    const top = visualModel.addVisualGroup({ content: [first, second], anchored: null });
    const dissolve = () => run(context, cmeOperations.dissolveVisualGroup.create(context.createContext, {
      visualModel: visualModel.getId(),
      visualEntity: nodeA,
    }));

    expect((await dissolve()).removed).toBe(top);
    expect((visualModel.getVisualEntity(first) as VisualGroup).content).toEqual([nodeA, nodeB]);
    expect(visualModel.getVisualEntity(second)).not.toBeNull();

    expect((await dissolve()).removed).toBe(first);
    expect(visualModel.getVisualEntity(second)).not.toBeNull();
  });

  test("Node outside of a group fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const node = addNode(context, a);

    const result = await context.executor.execute(
      cmeOperations.dissolveVisualGroup.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        visualEntity: node,
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
  });

});
