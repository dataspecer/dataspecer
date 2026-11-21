import { describe, expect, test } from "vitest";
import { isVisualGroup } from "@dataspecer/visual-model";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  getVisualNode,
  run,
  showClass,
} from "../operation-test-utilities";

describe("createVisualGroup", () => {

  test("Group creation resets anchors of the content.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const firstNode = await showClass(context, first, 0);
    const secondNode = await showClass(context, second, 500);
    await run(context, cmeOperations.toggleAnchor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntity: firstNode.id,
      anchored: true,
    }));

    const group = await run(context, cmeOperations.createVisualGroup.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      visualEntities: [firstNode.id, secondNode.id],
    }));
    const created = context.visualModel.getVisualEntity(group.created);
    expect(created !== null && isVisualGroup(created)).toBe(true);
    expect(getVisualNode(context.visualModel, firstNode.id).position.anchored).toBe(null);
  });

});
