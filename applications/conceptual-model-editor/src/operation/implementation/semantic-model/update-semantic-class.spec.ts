import { describe, expect, test } from "vitest";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import { MissingModel } from "../../operation";
import {
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("updateSemanticClass", () => {

  test("Values are replaced.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");

    await run(context, cmeOperations.updateSemanticClass.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      entity: a,
      iri: "http://example.com/next",
      name: { en: "Next" },
      description: { en: "Next description" },
      externalDocumentationUrl: "http://example.com/doc",
      order: "2",
    }));

    const entity = context.semanticModel.getEntities()[a] as SemanticModelClass;
    expect(entity).toMatchObject({
      iri: "http://example.com/next",
      name: { en: "Next" },
      description: { en: "Next description" },
      externalDocumentationUrl: "http://example.com/doc",
      order: "2",
    });
  });

  test("Missing model fails.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");

    const result = await context.executor.execute(
      cmeOperations.updateSemanticClass.create(context.createContext, {
        semanticModel: "missing",
        entity: a,
        iri: null,
        name: null,
        description: null,
        externalDocumentationUrl: null,
        order: null,
      }));

    expect(result.exception).toBeInstanceOf(MissingModel);
  });

});
