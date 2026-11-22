import { describe, expect, test } from "vitest";

import { createUpdateSemanticModelBatch } from "./update-semantic-model-batch";
import { CmeSemanticModelType } from "../../dataspecer/cme-model";
import { createOperationTestContext } from "../../operation/implementation/operation-test-utilities";

type DialogState = Parameters<typeof createUpdateSemanticModelBatch>[2];

describe("createUpdateSemanticModelBatch", () => {

  test("Executed batch sets the color, the alias and the base IRI.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const state = createState(model, CmeSemanticModelType.InMemorySemanticModel);

    const outcome = await context.executor.execute(
      createUpdateSemanticModelBatch(context.createContext, context.visualModel, state));

    expect(outcome.exception).toBeUndefined();
    expect(context.semanticModel.getAlias()).toBe("Vocabulary");
    expect(context.semanticModel.getBaseIri()).toBe("http://example.com/");
    expect(context.visualModel.getModelColor(model)).toBe("#ff0000");
  });

  test("Only the color is set for a read-only model.", () => {
    const context = createOperationTestContext();
    const state = createState("external", CmeSemanticModelType.ExternalSemanticModel);

    const batch = createUpdateSemanticModelBatch(context.createContext, context.visualModel, state);

    expect(batch.operations).toMatchObject([{ model: "external", color: "#ff0000" }]);
  });

  test("Without a visual model the color is not set.", () => {
    const context = createOperationTestContext();
    const state = createState("model", CmeSemanticModelType.InMemorySemanticModel);

    const batch = createUpdateSemanticModelBatch(context.createContext, null, state);

    expect(batch.operations).toMatchObject([{ semanticModel: "model", alias: "Vocabulary" }]);
  });

});

function createState(identifier: string, modelType: CmeSemanticModelType): DialogState {
  return {
    identifier,
    modelType,
    color: "#ff0000",
    baseIri: "http://example.com/",
    label: "Vocabulary",
  } as unknown as DialogState;
}
