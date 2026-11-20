import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { createOperationTestContext, run } from "../operation-test-utilities";

describe("updateVisualModelLabel", () => {

  test("Label is set and cleared.", async () => {
    const context = createOperationTestContext();
    const setLabel = (label: { [language: string]: string } | null) => run(context,
      cmeOperations.updateVisualModelLabel.create(context.createContext, {
        visualModel: context.visualModel.getId(),
        label,
      }));

    await setLabel({ en: "Overview" });
    expect(context.visualModel.getLabel()).toEqual({ en: "Overview" });
    // The other visual model is not changed.
    expect(context.otherVisualModel.getLabel()).not.toEqual({ en: "Overview" });

    await setLabel(null);
    expect(context.visualModel.getLabel()).toBeNull();
  });

});
