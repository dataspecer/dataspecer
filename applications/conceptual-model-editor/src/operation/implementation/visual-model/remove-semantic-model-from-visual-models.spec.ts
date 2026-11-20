import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { createOperationTestContext, run } from "../operation-test-utilities";

describe("removeSemanticModelFromVisualModels", () => {

  test("Model data is removed from all visual models.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    context.visualModel.setModelColor(model, "#111111");
    context.otherVisualModel.setModelColor(model, "#222222");
    context.visualModel.setModelColor("other-model", "#333333");

    await run(context, cmeOperations.removeSemanticModelFromVisualModels.create(context.createContext, {
      model,
    }));

    // Visual models generate a color when there is none stored,
    // so we check the stored data instead.
    expect(context.visualModel.getModelsData().has(model)).toBe(false);
    expect(context.otherVisualModel.getModelsData().has(model)).toBe(false);
    expect(context.visualModel.getModelColor("other-model")).toBe("#333333");
  });

});
