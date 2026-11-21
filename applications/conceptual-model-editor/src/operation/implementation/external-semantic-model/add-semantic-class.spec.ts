import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { ModelIsNotWritable } from "../../operation";
import {
  addFakeExternalSemanticModel,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("addSemanticClass", () => {

  test("Class is requested from the external source.", async () => {
    const context = createOperationTestContext();
    const { model, calls } = addFakeExternalSemanticModel(context);

    await run(context, cmeOperations.addSemanticClass.create(context.createContext, {
      semanticModel: model.getId(),
      entity: "http://example.com/a",
    }));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^add .*http:\/\/example.com\/a/);
  });

  test("In-memory model is not an external model.", async () => {
    const context = createOperationTestContext();

    const result = await context.executor.execute(
      cmeOperations.addSemanticClass.create(context.createContext, {
        semanticModel: context.semanticModel.getId(),
        entity: "http://example.com/a",
      }));

    expect(result.exception).toBeInstanceOf(ModelIsNotWritable);
  });

});
