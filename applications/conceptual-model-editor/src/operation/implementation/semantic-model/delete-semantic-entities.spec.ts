import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import {
  addFakeExternalSemanticModel,
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("deleteSemanticEntities", () => {

  test("Delete entities removes them from the model.", async () => {
    const context = createOperationTestContext();
    const first = await createClass(context, "first");
    const result = await run(context, cmeOperations.deleteSemanticEntities.create(context.createContext, {
      entities: [
        { identifier: first, model: context.semanticModel.getId() },
        { identifier: "missing", model: "missing-model" },
      ],
    }));
    expect(context.semanticModel.getEntities()[first]).toBeUndefined();
    expect(result.failed).toEqual([{ identifier: "missing", model: "missing-model" }]);
  });

  test("Entity of an external model is released.", async () => {
    const context = createOperationTestContext();
    const { model, calls } = addFakeExternalSemanticModel(context);

    const result = await run(context, cmeOperations.deleteSemanticEntities.create(context.createContext, {
      entities: [{ identifier: "http://example.com/a", model: model.getId() }],
    }));

    expect(result.failed).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^release .*http:\/\/example.com\/a/);
  });

});
