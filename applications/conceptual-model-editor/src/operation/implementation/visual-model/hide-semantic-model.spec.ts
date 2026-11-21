import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  addEdge,
  addNode,
  addSemanticModel,
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("hideSemanticModel", () => {

  test("Visuals of the model classes are removed with their edges.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const ab = await createRelationship(context, a, b, "a-b");
    const otherModel = addSemanticModel(context);
    const other = await createClass(context, "other", { model: otherModel });
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    const otherNode = addNode(context, other, { model: otherModel.getId() });
    addEdge(context, ab, nodeA, nodeB);

    await run(context, cmeOperations.hideSemanticModel.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      semanticModel: context.semanticModel.getId(),
    }));

    expect(context.visualModel.getVisualEntity(nodeA)).toBeNull();
    expect(context.visualModel.getVisualEntity(nodeB)).toBeNull();
    expect(visualRelationships(context.visualModel)).toHaveLength(0);
    expect(context.visualModel.getVisualEntity(otherNode)).not.toBeNull();
  });

});
