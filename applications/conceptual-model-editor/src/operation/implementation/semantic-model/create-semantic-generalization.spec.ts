import { describe, expect, test } from "vitest";
import { SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";

import { cmeOperations } from "../../operations";
import {
  createClass,
  createOperationTestContext,
  run,
} from "../operation-test-utilities";

describe("createSemanticGeneralization", () => {

  test("Generalization is created between child and parent.", async () => {
    const context = createOperationTestContext();
    const child = await createClass(context, "child");
    const parent = await createClass(context, "parent");

    const result = await run(context, cmeOperations.createSemanticGeneralization.create(context.createContext, {
      semanticModel: context.semanticModel.getId(),
      iri: "http://example.com/generalization",
      child,
      parent,
    }));

    expect(result.created).toBe(result.args.identifier);
    const entity = context.semanticModel.getEntities()[result.created] as SemanticModelGeneralization;
    expect(entity).toMatchObject({
      iri: "http://example.com/generalization",
      child,
      parent,
    });
  });

});
