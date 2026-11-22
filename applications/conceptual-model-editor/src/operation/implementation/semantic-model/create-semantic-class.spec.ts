import { describe, expect, test } from "vitest";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import { ModelIsNotWritable } from "../../operation";
import {
  addFakeExternalSemanticModel,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("createSemanticClass", () => {

  test("Class is created with the given values.", async () => {
    const context = createOperationTestContext();

    const result = await run(context, cmeOperations.createSemanticClass.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      iri: "http://example.com/a",
      name: { en: "A" },
      description: { en: "Description" },
      externalDocumentationUrl: "http://example.com/doc",
      order: "2",
    }));

    expect(result.created).toBe(result.args.identifier);
    const entity = context.semanticModel.getEntities()[result.created] as SemanticModelClass;
    expect(entity).toMatchObject({
      iri: "http://example.com/a",
      name: { en: "A" },
      description: { en: "Description" },
      externalDocumentationUrl: "http://example.com/doc",
      order: "2",
    });
  });

  test("External model is not writable.", async () => {
    const context = createOperationTestContext();
    const { model } = addFakeExternalSemanticModel(context);

    const result = await context.executor.execute(
      cmeOperations.createSemanticClass.create(context.createContext, {
        semanticModel: model.getId(),
        iri: null,
        name: null,
        description: null,
        externalDocumentationUrl: null,
        order: null,
      }));

    expect(result.exception).toBeInstanceOf(ModelIsNotWritable);
  });

});
