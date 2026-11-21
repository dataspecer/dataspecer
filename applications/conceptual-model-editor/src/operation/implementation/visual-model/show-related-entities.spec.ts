import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  addNode,
  createClass,
  createGeneralization,
  createOperationTestContext,
  createRelationship,
  run,
  visualRelationships,
} from "../operation-test-utilities";

describe("showRelatedEntities", () => {

  test("Edges to visible related classes are added.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const c = await createClass(context, "c");
    const hidden = await createClass(context, "hidden");
    const ab = await createRelationship(context, a, b, "a-b");
    const ac = await createGeneralization(context, a, c);
    await createRelationship(context, a, hidden, "a-hidden");
    const nodeA = addNode(context, a);
    const nodeB = addNode(context, b);
    const nodeC = addNode(context, c);

    await run(context, cmeOperations.showRelatedEntities.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: a,
    }));

    const edges = visualRelationships(context.visualModel)
      .map(item => [item.representedRelationship, item.visualSource, item.visualTarget]);
    expect(edges).toHaveLength(2);
    expect(edges).toContainEqual([ab, nodeA, nodeB]);
    expect(edges).toContainEqual([ac, nodeA, nodeC]);
  });

});
