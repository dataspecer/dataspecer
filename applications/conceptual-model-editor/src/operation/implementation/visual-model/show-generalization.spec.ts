import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createGeneralization,
  createOperationTestContext,
  run,
  showClass,
  visualRelationships,
} from "../operation-test-utilities";

describe("showGeneralization", () => {

  test("Generalization between visible classes is shown.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const firstNode = await showClass(context, first, 0);
    const secondNode = await showClass(context, second, 500);
    // Create the generalization after the nodes, so showing a class
    // does not add the edge on its own.
    const generalization = await createGeneralization(context, first, second);

    await run(context, cmeOperations.showGeneralization.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: generalization,
    }));
    const edges = visualRelationships(context.visualModel);
    expect(edges.length).toBe(1);
    expect(edges[0].representedRelationship).toBe(generalization);
    expect(edges[0].visualSource).toBe(firstNode.id);
    expect(edges[0].visualTarget).toBe(secondNode.id);
  });

});
