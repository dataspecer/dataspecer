import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { ModelIsNotWritable } from "../../operation";
import {
  addFakeExternalSemanticModel,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("addSemanticClassSurroundings", () => {

  test("Surroundings are requested, not the class alone.", async () => {
    const context = createOperationTestContext();
    const { model, calls } = addFakeExternalSemanticModel(context);

    await run(context, cmeOperations.addSemanticClassSurroundings.create(context.createContext, {
      semanticModel: model.getId(),
      entity: "http://example.com/a",
    }));
    await run(context, cmeOperations.addSemanticClass.create(context.createContext, {
      semanticModel: model.getId(),
      entity: "http://example.com/a",
    }));

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatch(/^add .*http:\/\/example.com\/a/);
    // The surroundings query differs from the query for the class.
    expect(calls[0]).not.toBe(calls[1]);
  });

  test("In-memory model is not an external model.", async () => {
    const context = createOperationTestContext();

    const result = await context.executor.execute(
      cmeOperations.addSemanticClassSurroundings.create(context.createContext, {
        semanticModel: context.semanticModel.getId(),
        entity: "http://example.com/a",
      }));

    expect(result.exception).toBeInstanceOf(ModelIsNotWritable);
  });

});
