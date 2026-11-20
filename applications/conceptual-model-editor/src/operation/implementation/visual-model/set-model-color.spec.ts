import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { createOperationTestContext, run } from "../operation-test-utilities";

describe("setModelColor", () => {

  test("Color is stored only in the given visual model.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();

    await run(context, cmeOperations.setModelColor.create(context.createContext, {
      visualModel: context.visualModel.getId(),
      model,
      color: "#123456",
    }));

    expect(context.visualModel.getModelColor(model)).toBe("#123456");
    // Visual models generate a color when there is none stored,
    // so we check the stored data instead.
    expect(context.otherVisualModel.getModelsData().has(model)).toBe(false);
  });

});
