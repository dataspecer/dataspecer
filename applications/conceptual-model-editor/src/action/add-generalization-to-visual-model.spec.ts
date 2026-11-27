import { describe, expect, test, vi } from "vitest";

import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import {
  addNode,
  createClass,
  createGeneralization,
  createOperationTestContext,
  OperationTestContext,
  visualRelationships,
} from "../operation/implementation/operation-test-utilities";

describe("addSemanticGeneralizationToVisualModelAction", () => {

  test("Generalization is shown between all nodes of the child and the parent.", async () => {
    const context = createOperationTestContext();
    const child = await createClass(context, "child");
    const parent = await createClass(context, "parent");
    const generalization = await createGeneralization(context, child, parent);
    addNode(context, child);
    addNode(context, child);
    addNode(context, parent);
    const { notifications, graph } = prepare(context);

    await addSemanticGeneralizationToVisualModelAction(
      notifications, graph, context.visualModel, generalization, context.semanticModel.getId());

    expect(visualRelationships(context.visualModel)).toHaveLength(2);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  test("Missing parent node is reported.", async () => {
    const context = createOperationTestContext();
    const child = await createClass(context, "child");
    const parent = await createClass(context, "parent");
    const generalization = await createGeneralization(context, child, parent);
    addNode(context, child);
    const { notifications, graph } = prepare(context);

    await addSemanticGeneralizationToVisualModelAction(
      notifications, graph, context.visualModel, generalization, context.semanticModel.getId());

    expect(visualRelationships(context.visualModel)).toEqual([]);
    expect(notifications.error).toHaveBeenCalledOnce();
  });

});

function prepare(context: OperationTestContext) {
  const notifications = { error: vi.fn() } as unknown as UseNotificationServiceWriterType;
  const graph = { executor: () => context.executor } as unknown as UseModelGraphContextType;
  return { notifications, graph };
}
