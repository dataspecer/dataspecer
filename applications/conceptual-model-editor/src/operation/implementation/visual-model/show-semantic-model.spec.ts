import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { MissingModel } from "../../operation";
import {
  addNode,
  addSemanticModel,
  createAttribute,
  createClass,
  createOperationTestContext,
  createRelationship,
  getVisualNode,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("showSemanticModel", () => {

  test("Classes of the model are shown with edges between them.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    // Class in another model is not shown.
    const other = await createClass(context, "other", { model: addSemanticModel(context) });

    await run(context, cmeOperations.showSemanticModel.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      semanticModel: context.semanticModel.getId(),
      fallbackPosition: { x: 0, y: 0 },
    }));

    expect(context.visualModel.hasVisualEntityForRepresented(a)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(b)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(other)).toBe(false);
    expect(visualRelationships(context.visualModel)
      .map(item => item.representedRelationship)).toEqual([ab]);
  });

  test("Visible class gets its hidden attributes.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const shown = await createAttribute(context, a, "shown");
    const hidden = await createAttribute(context, a, "hidden");
    const node = addNode(context, a, { content: [shown] });

    await run(context, cmeOperations.showSemanticModel.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      semanticModel: context.semanticModel.getId(),
      fallbackPosition: { x: 0, y: 0 },
    }));

    expect(getVisualNode(context.visualModel, node).content).toEqual([shown, hidden]);
    expect(context.visualModel.getVisualEntitiesForRepresented(a)).toHaveLength(1);
  });

  test("Missing semantic model fails.", async () => {
    const context = createOperationTestContext();

    const result = await context.executor.execute(
      cmeOperations.showSemanticModel.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        semanticModel: "missing",
        fallbackPosition: { x: 0, y: 0 },
      }));

    expect(result.exception).toBeInstanceOf(MissingModel);
  });

});
