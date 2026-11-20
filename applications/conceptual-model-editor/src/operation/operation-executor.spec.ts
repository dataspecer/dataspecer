import { describe, expect, test } from "vitest";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

import {
  CmeOperationExecutorState, createCmeOperationExecutor,
} from "./operation-executor";
import { cmeOperations } from "./operations";
import { MissingCmeExecutor, MissingModel } from "./operation";
import { createOperationTestContext } from "./implementation/operation-test-utilities";

describe("CmeOperationExecutor", () => {

  test("Failure is reported as an outcome with exception.", async () => {
    const context = createOperationTestContext();
    const result = await context.executor.execute(cmeOperations.createSemanticClass.create(context.createContext, {
      semanticModel: "missing-model",
      iri: null,
      name: null,
      description: null,
      externalDocumentationUrl: null,
    }));
    expect(result.exception).toBeInstanceOf(MissingModel);
    expect(result.args.semanticModel).toBe("missing-model");
  });

  test("Unknown operation is reported as missing executor.", async () => {
    const context = createOperationTestContext();
    const result = await context.executor.execute({ type: "unknown" });
    expect(result.exception).toBeInstanceOf(MissingCmeExecutor);
  });

  test("Identifier of a created entity is prepared in create.", async () => {
    const context = createOperationTestContext();
    const preparingContext = {
      createEntityIdentifier: () => "prepared-identifier",
    };
    const args = cmeOperations.createSemanticClass.create(preparingContext, {
      semanticModel: context.semanticModel.getId(),
      iri: "prepared",
      name: null,
      description: null,
      externalDocumentationUrl: null,
    });
    expect(args.identifier).toBe("prepared-identifier");
    // Executing the arguments creates the entity with the prepared identifier.
    const result = await context.executor.execute(args);
    expect(result.exception).toBeUndefined();
    if (result.exception === undefined) {
      expect(result.created).toBe("prepared-identifier");
    }
    expect(context.semanticModel.getEntities()["prepared-identifier"])
      .toBeDefined();
  });

  test("Executor rejects operations with the same type.", () => {
    const operation = cmeOperations.createSemanticClass;
    expect(() => createCmeOperationExecutor(
      { first: operation, second: operation },
      { entityModels: [], visualModels: [], createNewEntityIdentifier: () => "" })).toThrow();
  });

  test("Executor reads the state on every execution.", async () => {
    const semanticModel = new InMemorySemanticModel();
    const state: CmeOperationExecutorState = {
      entityModels: [],
      visualModels: [],
      createNewEntityIdentifier: () => "first",
    };
    const executor = createCmeOperationExecutor(cmeOperations, state);
    const parameters = {
      semanticModel: semanticModel.getId(),
      iri: null,
      name: null,
      description: null,
      externalDocumentationUrl: null,
    };
    // There is no model yet.
    const before = await executor.execute(cmeOperations.createSemanticClass.create(
      executor.createContext, parameters));
    expect(before.exception).toBeInstanceOf(MissingModel);
    // Update the state, the existing executor sees the change.
    state.entityModels = [semanticModel];
    state.createNewEntityIdentifier = () => "second";
    const after = await executor.execute(cmeOperations.createSemanticClass.create(
      executor.createContext, parameters));
    expect(after.exception).toBeUndefined();
    expect(semanticModel.getEntities()["second"]).toBeDefined();
  });

});
