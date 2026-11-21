import { describe, expect, test } from "vitest";
import { VisualNode } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  addNode,
  createAttribute,
  createClass,
  createGeneralization,
  createOperationTestContext,
  createRelationship,
  getVisualNode,
  run,
  visualRelationships,
} from "../operation-test-utilities";

const fallbackPosition = { x: 0, y: 0 };

describe("showEntityNeighborhood", () => {

  test("Class neighborhood are the directly connected classes.", async () => {
    const context = createOperationTestContext();
    const center = await createClass(context, "center");
    const left = await createClass(context, "left");
    const right = await createClass(context, "right");
    const far = await createClass(context, "far");
    const attribute = await createAttribute(context, center, "attribute");
    await createRelationship(context, center, left, "center-left");
    await createGeneralization(context, right, center);
    // Not connected to the center.
    await createRelationship(context, right, far, "right-far");

    await run(context, cmeOperations.showEntityNeighborhood.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: center,
      fallbackPosition,
    }));

    const visualModel = context.visualModel;
    const [centerNode] = visualModel.getVisualEntitiesForRepresented(center) as VisualNode[];
    const [leftNode] = visualModel.getVisualEntitiesForRepresented(left) as VisualNode[];
    expect(centerNode.content).toEqual([attribute]);
    // Only the class the neighborhood is shown for gets attributes.
    expect(leftNode.content).toEqual([]);
    expect(visualModel.hasVisualEntityForRepresented(right)).toBe(true);
    expect(visualModel.hasVisualEntityForRepresented(far)).toBe(false);
    expect(visualRelationships(visualModel)).toHaveLength(2);
  });

  test("Visible classes are not added again.", async () => {
    const context = createOperationTestContext();
    const center = await createClass(context, "center");
    const left = await createClass(context, "left");
    await createRelationship(context, center, left, "center-left");
    const leftNode = addNode(context, left);
    const show = () => run(context, cmeOperations.showEntityNeighborhood.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: center,
      fallbackPosition,
    }));

    await show();
    await show();

    expect(context.visualModel.getVisualEntitiesForRepresented(left)
      .map(item => item.id)).toEqual([leftNode]);
    expect(context.visualModel.getVisualEntitiesForRepresented(center)).toHaveLength(1);
    expect(visualRelationships(context.visualModel)).toHaveLength(1);
  });

  test("Relationship neighborhood are both ends and the relationship.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const other = await createClass(context, "other");
    const ab = await createRelationship(context, a, b, "a-b");
    await createRelationship(context, a, other, "a-other");

    await run(context, cmeOperations.showEntityNeighborhood.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: ab,
      fallbackPosition,
    }));

    const edges = visualRelationships(context.visualModel);
    expect(edges.map(item => item.representedRelationship)).toEqual([ab]);
    expect(context.visualModel.hasVisualEntityForRepresented(a)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(b)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(other)).toBe(false);
  });

  test("Attribute neighborhood is the domain, the attribute is added to it.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const shown = await createAttribute(context, a, "shown");
    const attribute = await createAttribute(context, a, "attribute");
    const node = addNode(context, a, { content: [shown] });

    await run(context, cmeOperations.showEntityNeighborhood.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: attribute,
      fallbackPosition,
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([shown, attribute]);
    expect(context.visualModel.getVisualEntitiesForRepresented(a)).toHaveLength(1);
  });

  test("Generalization is not supported.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const generalization = await createGeneralization(context, a, b);

    const result = await context.executor.execute(
      cmeOperations.showEntityNeighborhood.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        entity: generalization,
        fallbackPosition,
      }));

    expect(result.exception).toBeInstanceOf(InvalidEntity);
    expect(context.visualModel.getVisualEntities().size).toBe(0);
  });

});
