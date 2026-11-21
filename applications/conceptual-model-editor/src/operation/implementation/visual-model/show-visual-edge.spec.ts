import { describe, expect, test } from "vitest";
import { isVisualProfileRelationship } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import { InvalidEntity } from "../../operation";
import {
  createClass,
  createClassProfile,
  createOperationTestContext,
  createRelationship,
  run,
  showClass,
  showClassProfile,
  visualProfileRelationships,
  visualRelationships,
} from "../operation-test-utilities";

describe("showVisualEdge", () => {

  test("Show visual edge connects only the given visual ends.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await showClass(context, first, 0);
    // Second visual node of the same class.
    const firstCopy = await showClass(context, first, 200);
    const secondNode = await showClass(context, second, 500);
    // Create the relationship after the nodes, so showing a class
    // does not add the edges on its own.
    const relationship = await createRelationship(context, first, second, "rel");

    const created = await run(context, cmeOperations.showVisualEdge.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
      visualSource: firstCopy.id,
      visualTarget: secondNode.id,
    }));
    expect(created.created).toBe(true);
    const edges = visualRelationships(context.visualModel);
    expect(edges.length).toBe(1);
    expect(edges[0].visualSource).toBe(firstCopy.id);
    expect(edges[0].visualTarget).toBe(secondNode.id);

    // Showing again returns the existing edge.
    const again = await run(context, cmeOperations.showVisualEdge.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
      visualSource: firstCopy.id,
      visualTarget: secondNode.id,
    }));
    expect(again.created).toBe(false);
    expect(again.visualEdge).toBe(created.visualEdge);
    expect(visualRelationships(context.visualModel).length).toBe(1);
  });

  test("Show visual edge creates profile edge for a class profile.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const firstNode = await showClass(context, first, 0);
    const profile = await createClassProfile(context, first);
    const profileNode = await showClassProfile(context, profile, 0);
    // Showing the class profile adds the profile edge, remove it
    // so we start from a clean state.
    visualProfileRelationships(context.visualModel)
      .forEach(item => context.visualModel.deleteVisualEntity(item.id));

    const result = await run(context, cmeOperations.showVisualEdge.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: profile,
      visualSource: profileNode.id,
      visualTarget: firstNode.id,
    }));
    expect(result.created).toBe(true);
    const edge = context.visualModel.getVisualEntity(result.visualEdge);
    expect(edge !== null && isVisualProfileRelationship(edge)).toBe(true);
  });

  test("Show visual edge rejects a class.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const firstNode = await showClass(context, first, 0);
    const result = await context.executor.execute(cmeOperations.showVisualEdge.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: first,
      visualSource: firstNode.id,
      visualTarget: firstNode.id,
    }));
    expect(result.exception).toBeInstanceOf(InvalidEntity);
    expect(visualRelationships(context.visualModel).length).toBe(0);
  });

});
