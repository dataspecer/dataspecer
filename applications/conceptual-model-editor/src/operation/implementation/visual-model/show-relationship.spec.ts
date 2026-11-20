import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
  showClass,
  visualRelationships,
} from "../operation-test-utilities";

describe("showRelationship", () => {

  test("Relationship is not shown when an end is missing.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await showClass(context, first, 0);
    const relationship = await createRelationship(context, first, second, "rel");

    const result = await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(result.shown).toBe(false);
    expect(visualRelationships(context.visualModel).length).toBe(0);
  });

  test("Relationship between visible classes is shown once.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    await showClass(context, first, 0);
    await showClass(context, second, 500);
    // Create the relationship after the nodes, so showing a class
    // does not add the edge on its own.
    const relationship = await createRelationship(context, first, second, "rel");

    const shown = await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(shown.shown).toBe(true);
    expect(visualRelationships(context.visualModel).length).toBe(1);

    // Showing again must not create a duplicate.
    await run(context, cmeOperations.showRelationship.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entity: relationship,
    }));
    expect(visualRelationships(context.visualModel).length).toBe(1);
  });

});
