import { describe, expect, test } from "vitest";

import { cmeOperations } from "../../operations";
import { ModelIsNotWritable } from "../../operation";
import {
  addFakeExternalSemanticModel,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("updateSemanticModel", () => {

  test("Alias and base IRI are changed.", async () => {
    const context = createOperationTestContext();

    await run(context, cmeOperations.updateSemanticModel.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      alias: "Vocabulary",
      baseIri: "http://example.com/",
    }));

    expect(context.semanticModel.getAlias()).toBe("Vocabulary");
    expect(context.semanticModel.getBaseIri()).toBe("http://example.com/");
  });

  test("Null base IRI is stored as an empty string.", async () => {
    const context = createOperationTestContext();
    context.semanticModel.setBaseIri("http://example.com/");

    await run(context, cmeOperations.updateSemanticModel.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      alias: null,
      baseIri: null,
    }));

    expect(context.semanticModel.getBaseIri()).toBe("");
  });

  test("External model is not writable.", async () => {
    const context = createOperationTestContext();
    const { model } = addFakeExternalSemanticModel(context);

    const result = await context.executor.execute(
      cmeOperations.updateSemanticModel.create(context.createContext, {
        semanticModel: model.getId(),
        alias: "Vocabulary",
        baseIri: null,
      }));

    expect(result.exception).toBeInstanceOf(ModelIsNotWritable);
  });

});
