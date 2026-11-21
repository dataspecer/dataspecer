import { describe, expect, test } from "vitest";

import {
  createClass,
  createOperationTestContext,
  createRelationship,
  showClass,
  STRING_RANGE,
  visualRelationships,
} from "../operation-test-utilities";

describe("showSemanticClass", () => {

  test("Show class adds attributes and related edges.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await createRelationship(context, first, second, "rel");
    const attribute = await createRelationship(context, first, STRING_RANGE, "attr");

    const firstNode = await showClass(context, first, 0);
    expect(firstNode.content).toEqual([attribute]);
    // The other end of the relationship is not visible yet.
    expect(visualRelationships(context.visualModel).length).toBe(0);

    await showClass(context, second, 500);
    expect(visualRelationships(context.visualModel).length).toBe(1);
  });

});
