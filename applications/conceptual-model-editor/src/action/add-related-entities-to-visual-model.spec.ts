import { describe, expect, test, vi } from "vitest";

import { addRelatedEntitiesAction } from "./add-related-entities-to-visual-model";
import { UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { cmeOperations } from "../operation";
import {
  addNode,
  addSemanticModel,
  createClass,
  createClassProfile,
  createGeneralization,
  createOperationTestContext,
  OperationTestContext,
  run,
  visualProfileRelationships,
  visualRelationships,
} from "../operation/implementation/operation-test-utilities";

describe("addRelatedEntitiesAction", () => {

  test("Relationship and generalization to a node in the visual model are shown.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    await createRelationshipIn(context, context.semanticModel.getId(), a, b);
    await createGeneralization(context, a, b);
    const target = addNode(context, b);
    const source = addNode(context, a);

    await addRelatedEntitiesAction(...prepare(context), context.visualModel, a);

    expect(visualRelationships(context.visualModel)).toMatchObject([
      { visualSource: source, visualTarget: target },
      { visualSource: source, visualTarget: target },
    ]);
  });

  test("Profile edge from a shown class profile is added.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const profile = await createClassProfile(context, a);
    const source = addNode(context, profile);
    const target = addNode(context, a);

    await addRelatedEntitiesAction(...prepare(context), context.visualModel, a);

    expect(visualProfileRelationships(context.visualModel))
      .toMatchObject([{ entity: profile, visualSource: source, visualTarget: target }]);
  });

  test("Relationship in a model just added to the executor is shown.", async () => {
    const context = createOperationTestContext();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const other = addSemanticModel(context);
    await createRelationshipIn(context, other.getId(), a, b);
    addNode(context, b);
    addNode(context, a);

    await addRelatedEntitiesAction(...prepare(context), context.visualModel, a);

    expect(visualRelationships(context.visualModel)).toHaveLength(1);
  });

});

function prepare(context: OperationTestContext): [
  UseNotificationServiceWriterType, UseModelGraphContextType,
] {
  const notifications = { error: vi.fn() } as unknown as UseNotificationServiceWriterType;
  const graph = { executor: () => context.executor } as unknown as UseModelGraphContextType;
  return [notifications, graph];
}

async function createRelationshipIn(
  context: OperationTestContext, model: string, domain: string, range: string,
): Promise<string> {
  const result = await run(context, cmeOperations.createSemanticRelationship.create(context.createContext, {
    semanticModel: model,
    iri: "a-b",
    name: null,
    description: null,
    domain,
    domainCardinality: null,
    range,
    rangeCardinality: null,
    externalDocumentationUrl: null,
    order: null,
  }));
  return result.created;
}
