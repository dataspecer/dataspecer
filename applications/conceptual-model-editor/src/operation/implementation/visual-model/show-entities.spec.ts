import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  createRelationship,
  run,
} from "../operation-test-utilities";

describe("showEntities", () => {

  test("Show entities adds nodes with related edges.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const second = await createClass(context, "second");
    const relationship = await createRelationship(context, first, second, "rel");

    await run(context, cmeOperations.showEntities.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      entities: [
        { identifier: first, position: { x: 0, y: 0 } },
        { identifier: second, position: { x: 300, y: 0 } },
      ],
      fallbackPosition: { x: 0, y: 0 },
    }));
    expect(context.visualModel.hasVisualEntityForRepresented(first)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(second)).toBe(true);
    expect(context.visualModel.hasVisualEntityForRepresented(relationship)).toBe(true);
  });

});
