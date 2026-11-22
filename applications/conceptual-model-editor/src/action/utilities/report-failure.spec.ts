import { describe, expect, test } from "vitest";

import { reportFailure } from "./report-failure";
import { cmeOperations } from "../../operation";
import { MissingModel } from "../../operation/operation";
import { UseNotificationServiceWriterType } from "../../notification/notification-service-context";
import { createOperationTestContext } from "../../operation/implementation/operation-test-utilities";

describe("reportFailure", () => {

  test("Success is not reported and the result is available.", async () => {
    const { notifications, messages } = createNotifications();
    const context = createOperationTestContext();

    const outcome = await context.executor.execute(createClass(context, context.semanticModel.getId()));

    if (reportFailure(notifications, outcome, "Can not create class.")) {
      expect.unreachable();
    } else {
      // The outcome is narrowed to the success here.
      expect(context.semanticModel.getEntities()[outcome.created]).toBeDefined();
    }
    expect(messages).toEqual([]);
  });

  test("Failure is reported to the user.", async () => {
    const { notifications, messages } = createNotifications();
    const context = createOperationTestContext();

    const outcome = await context.executor.execute(createClass(context, "missing"));

    expect(reportFailure(notifications, outcome, "Can not create class.")).toBe(true);
    expect(outcome.exception).toBeInstanceOf(MissingModel);
    expect(messages).toEqual(["error: Can not create class."]);
  });

  test("Failed batch is reported to the user.", async () => {
    const { notifications, messages } = createNotifications();
    const context = createOperationTestContext();
    const batch = context.executor.batch()
      .addArguments(createClass(context, context.semanticModel.getId()))
      .addArguments(createClass(context, "missing"))
      .build();

    const outcome = await context.executor.execute(batch);

    expect(reportFailure(notifications, outcome, "Can not create classes.")).toBe(true);
    expect(messages).toEqual(["error: Can not create classes."]);
  });

});

function createNotifications() {
  const messages: string[] = [];
  const notifications: UseNotificationServiceWriterType = {
    success: (label) => messages.push("success: " + label),
    error: (label) => messages.push("error: " + label),
  };
  return { notifications, messages };
}

function createClass(
  context: ReturnType<typeof createOperationTestContext>,
  semanticModel: string,
) {
  return cmeOperations.createSemanticClass.create(context.createContext, {
    semanticModel,
    iri: "a",
    name: null,
    description: null,
    externalDocumentationUrl: null,
    order: null,
  });
}
