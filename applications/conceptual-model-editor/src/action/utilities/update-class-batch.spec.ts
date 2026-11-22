import { describe, expect, test } from "vitest";
import { isSemanticModelGeneralization, SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { createCreateClassBatch, createUpdateClassBatch } from "./update-class-batch";
import { NewCmeSpecialization } from "../../dataspecer/cme-model/model";
import {
  addEdge,
  addNode,
  createClass,
  createGeneralization,
  createOperationTestContext,
  visualRelationships,
} from "../../operation/implementation/operation-test-utilities";

type DialogState = Parameters<typeof createUpdateClassBatch>[3];

describe("createUpdateClassBatch", () => {

  test("Without a visual model only the class and specializations are updated.", () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const state = createState(model, {
      externalDocumentationUrl: "", order: "",
      specializations: [specialization("parent", null)],
    });

    const batch = createUpdateClassBatch(context.createContext, null, "entity", createState(model, {}), state);

    expect(batch.operations).toMatchObject([{
      semanticModel: model,
      entity: "entity",
      iri: "http://example.com/a",
      name: { en: "A" },
      description: { en: "Description" },
      // Empty values are stored as null, as in the legacy adapter.
      externalDocumentationUrl: null,
      order: null,
    }, {
      entity: "entity",
      model,
      previous: [],
      next: [{ iri: null, specializationOf: "parent", generalization: null }],
      created: [{ model, child: "entity", parent: "parent" }],
      removed: [],
    }]);
    expect(batch.operations.length).toBe(2);
  });

  test("Created generalizations are shown and removed ones are hidden.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const child = await createClass(context, "child");
    const dropped = await createClass(context, "dropped");
    const added = await createClass(context, "added");
    const childNode = addNode(context, child);
    const droppedNode = addNode(context, dropped);
    const addedNode = addNode(context, added);
    const droppedGeneralization = await createGeneralization(context, child, dropped);
    addEdge(context, droppedGeneralization, childNode, droppedNode);
    const initial = createState(model, {
      specializations: [specialization(dropped, { identifier: droppedGeneralization, model })],
    });
    const state = createState(model, {
      order: "4", specializations: [specialization(added, null)],
    });

    const outcome = await context.executor.execute(createUpdateClassBatch(
      context.createContext, context.visualModel, child, initial, state));

    expect(outcome.exception).toBeUndefined();
    const entity = context.semanticModel.getEntities()[child] as SemanticModelClass;
    expect(entity).toMatchObject({ iri: "http://example.com/a", name: { en: "A" }, order: "4" });
    const edges = visualRelationships(context.visualModel);
    expect(edges.length).toBe(1);
    expect(edges[0]).toMatchObject({ visualSource: childNode, visualTarget: addedNode });
    expect(context.semanticModel.getEntities()[edges[0].representedRelationship])
      .toMatchObject({ child, parent: added });
  });

});

describe("createCreateClassBatch", () => {

  test("Executed batch creates the class and its specializations.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const parent = await createClass(context, "parent");
    const state = createState(model, {
      order: "1", specializations: [specialization(parent, null)],
    });

    const { batch, created } = createCreateClassBatch(context.createContext, state);
    const outcome = await context.executor.execute(batch);

    expect(outcome.exception).toBeUndefined();
    expect(created.model).toBe(model);
    expect(context.semanticModel.getEntities()[created.identifier]).toMatchObject({
      iri: "http://example.com/a", name: { en: "A" }, externalDocumentationUrl: "http://example.com/doc", order: "1",
    });
    const generalizations = Object.values(context.semanticModel.getEntities())
      .filter(isSemanticModelGeneralization);
    expect(generalizations).toMatchObject([{ child: created.identifier, parent }]);
  });

});

/**
 * Only the fields the batch reads, the rest of the dialog state is not used.
 */
function createState(
  model: string,
  overrides: Partial<Record<keyof DialogState, unknown>>,
): DialogState {
  return {
    model: { identifier: model },
    iri: "http://example.com/a",
    name: { en: "A" },
    description: { en: "Description" },
    externalDocumentationUrl: "http://example.com/doc",
    order: "",
    specializations: [],
    ...overrides,
  } as unknown as DialogState;
}

function specialization(
  parent: string,
  generalization: { identifier: string, model: string } | null,
): NewCmeSpecialization {
  return {
    iri: null,
    specializationOf: { identifier: parent, model: "" },
    ...(generalization === null ? {} : { generalization }),
  };
}
