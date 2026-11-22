import { describe, expect, test } from "vitest";

import { cmeOperations } from "./operations";
import { MissingModel } from "./operation";
import {
  createOperationTestContext,
  OperationTestContext,
} from "./implementation/operation-test-utilities";

const classParameters = (context: OperationTestContext, iri: string) => ({
  semanticModel: context.semanticModel.getId(),
  iri,
  name: null,
  description: null,
  externalDocumentationUrl: null,
  order: null,
});

describe("CmeOperationBatchBuilder", () => {

  test("Later operation can use identifier prepared by earlier one.", async () => {
    const context = createOperationTestContext();
    const createArgs = cmeOperations.createSemanticClass.create(
      context.createContext, classParameters(context, "a"));
    const batch = context.executor.batch()
      .addArguments(createArgs)
      .add(cmeOperations.showSemanticClass, {
        visualModel: context.visualModel.getId(),
        entity: createArgs.identifier,
        x: 0,
        y: 0,
      })
      .build();
    const outcome = await context.executor.execute(batch);
    expect(outcome.exception).toBeUndefined();
    if (outcome.exception === undefined) {
      // Typed result of the first operation.
      expect(outcome.results[0].created).toBe(createArgs.identifier);
      expect(outcome.results[1].status).toBe("success");
    }
    expect(context.visualModel
      .getVisualEntitiesForRepresented(createArgs.identifier)).toHaveLength(1);
  });

  test("Execution stops at first failure, rest is ignored.", async () => {
    const context = createOperationTestContext();
    const batch = context.executor.batch()
      .add(cmeOperations.createSemanticClass, classParameters(context, "a"))
      .add(cmeOperations.createSemanticClass, {
        ...classParameters(context, "b"),
        semanticModel: "missing-model",
      })
      .add(cmeOperations.createSemanticClass, classParameters(context, "c"))
      .build();
    const outcome = await context.executor.execute(batch);
    expect(outcome.exception).toBeInstanceOf(MissingModel);
    expect(outcome.results.map(item => item.status))
      .toEqual(["success", "failed", "ignored"]);
    // There is no rollback, the first class stays.
    const first = batch.operations[0].identifier;
    const last = batch.operations[2].identifier;
    expect(context.semanticModel.getEntities()[first]).toBeDefined();
    expect(context.semanticModel.getEntities()[last]).toBeUndefined();
  });

  test("Builder is immutable.", () => {
    const context = createOperationTestContext();
    const empty = context.executor.batch();
    empty.add(cmeOperations.createSemanticClass, classParameters(context, "a"));
    expect(empty.build().operations).toHaveLength(0);
  });

});
