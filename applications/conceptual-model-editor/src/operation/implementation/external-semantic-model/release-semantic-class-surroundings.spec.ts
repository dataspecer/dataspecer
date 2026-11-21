import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { ModelIsNotWritable } from "../../operation";
import {
  addFakeExternalSemanticModel,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("releaseSemanticClassSurroundings", () => {

  test("Released query is the one added for the surroundings.", async () => {
    const context = createOperationTestContext();
    const { model, calls } = addFakeExternalSemanticModel(context);
    const parameters = { semanticModel: model.getId(), entity: "http://example.com/a" };

    await run(context, cmeOperations.addSemanticClassSurroundings.create(
      context.createContext, parameters));
    await run(context, cmeOperations.releaseSemanticClassSurroundings.create(
      context.createContext, parameters));

    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe(calls[0].replace(/^add /, "release "));
  });

  test("In-memory model is not an external model.", async () => {
    const context = createOperationTestContext();

    const result = await context.executor.execute(
      cmeOperations.releaseSemanticClassSurroundings.create(context.createContext, {
        semanticModel: context.semanticModel.getId(),
        entity: "http://example.com/a",
      }));

    expect(result.exception).toBeInstanceOf(ModelIsNotWritable);
  });

});
