import { describe, expect, test } from "vitest";
import {
  createDefaultVisualModelFactory,
  VisualNode,
  VisualRelationship,
  WritableVisualModel,
} from "@dataspecer/visual-model";

import { CmeExecutionContext } from "../../operation-registry";
import { CmeOperationExecutionFailed } from "../../operation";
import { setVisualEntityColorExecutor } from "./set-visual-entity-color";

describe("setVisualEntityColorExecutor", () => {

  test("Set color of a node and a relationship.", async () => {
    const { context, visualModel, node, relationship } = prepare();

    await setVisualEntityColorExecutor(context, {
      type: "set-visual-entity-color-operation",
      visualModel: visualModel.getId(),
      visualEntities: [node, relationship],
      color: "#ff0000",
    });

    expect(getColor(visualModel, node)).toBe("#ff0000");
    expect(getColor(visualModel, relationship)).toBe("#ff0000");
  });

  test("Reset color using null.", async () => {
    const { context, visualModel, node } = prepare();
    visualModel.updateVisualEntity<VisualNode>(node, { color: "#ff0000" });

    await setVisualEntityColorExecutor(context, {
      type: "set-visual-entity-color-operation",
      visualModel: visualModel.getId(),
      visualEntities: [node],
      color: null,
    });

    expect(getColor(visualModel, node)).toBeNull();
  });

  test("Missing entity fails and changes nothing.", async () => {
    const { context, visualModel, node } = prepare();

    await expect(setVisualEntityColorExecutor(context, {
      type: "set-visual-entity-color-operation",
      visualModel: visualModel.getId(),
      visualEntities: [node, "missing"],
      color: "#ff0000",
    })).rejects.toThrow(CmeOperationExecutionFailed);

    expect(getColor(visualModel, node)).toBeUndefined();
  });

});

function prepare() {
  const visualModel = createDefaultVisualModelFactory()
    .createNewWritableVisualModelSync(null);
  const createNode = (representedEntity: string) => visualModel.addVisualNode({
    representedEntity,
    model: "m",
    position: { x: 0, y: 0, anchored: null },
    content: [],
    visualModels: [],
  });
  const node = createNode("s");
  const target = createNode("t");
  const relationship = visualModel.addVisualRelationship({
    representedRelationship: "r",
    model: "m",
    waypoints: [],
    visualSource: node,
    visualTarget: target,
  });
  const context: CmeExecutionContext = {
    semanticModels: [],
    profileModels: [],
    visualModels: [visualModel],
  };
  return { context, visualModel, node, relationship };
}

function getColor(visualModel: WritableVisualModel, identifier: string) {
  const entity = visualModel.getVisualEntity(identifier) as
    VisualNode | VisualRelationship;
  return entity.color;
}
