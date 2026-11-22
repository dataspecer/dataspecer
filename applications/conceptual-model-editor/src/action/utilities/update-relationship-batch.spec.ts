import { describe, expect, test } from "vitest";
import {
  isSemanticModelGeneralization,
  SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { createCreateRelationshipBatch, createUpdateRelationshipBatch } from "./update-relationship-batch";
import { NewCmeSpecialization } from "../../dataspecer/cme-model/model";
import {
  createClass,
  createGeneralization,
  createOperationTestContext,
  createRelationship,
  OperationTestContext,
} from "../../operation/implementation/operation-test-utilities";

type DialogState = Parameters<typeof createUpdateRelationshipBatch>[2];

describe("createUpdateRelationshipBatch", () => {

  test("Dialog state is mapped to the operation arguments.", () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const initial = createState(model, {
      specializations: [specialization("parent-1", { identifier: "g-1", model })],
    });
    const state = createState(model, {
      order: "",
      specializations: [specialization("parent-2", null)],
    });

    const batch = createUpdateRelationshipBatch(context.createContext, "entity", initial, state);

    expect(batch.operations).toMatchObject([{
      semanticModel: model,
      entity: "entity",
      iri: "http://example.com/r",
      name: { en: "Relationship" },
      description: { en: "Description" },
      domain: "domain",
      domainCardinality: [0, 1],
      range: "range",
      rangeCardinality: [1, null],
      externalDocumentationUrl: "http://example.com/doc",
      // Empty order is stored as null, as in the legacy adapter.
      order: null,
    }, {
      entity: "entity",
      model,
      previous: [{ iri: null, specializationOf: "parent-1", generalization: { identifier: "g-1", model } }],
      next: [{ iri: null, specializationOf: "parent-2", generalization: null }],
    }]);
  });

  test("Executed batch updates the relationship and its specializations.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const relationship = await createRelationship(context, a, b, "r");
    const kept = await createRelationship(context, a, b, "kept");
    const dropped = await createRelationship(context, a, b, "dropped");
    const added = await createRelationship(context, a, b, "added");
    const keptGeneralization = await createGeneralization(context, relationship, kept);
    const droppedGeneralization = await createGeneralization(context, relationship, dropped);
    const keptSpecialization = specialization(kept, { identifier: keptGeneralization, model });
    const initial = createState(model, {
      specializations: [keptSpecialization, specialization(dropped, { identifier: droppedGeneralization, model })],
    });
    const state = createState(model, {
      domain: { identifier: a }, range: { identifier: b }, order: "3",
      specializations: [keptSpecialization, specialization(added, null)],
    });

    const outcome = await context.executor.execute(
      createUpdateRelationshipBatch(context.createContext, relationship, initial, state));

    expect(outcome.exception).toBeUndefined();
    const entity = context.semanticModel.getEntities()[relationship] as SemanticModelRelationship;
    expect(entity.ends[1]).toMatchObject({
      iri: "http://example.com/r", name: { en: "Relationship" }, order: "3", cardinality: [1, null],
    });
    expect(parentsOf(context, relationship).sort()).toEqual([added, kept].sort());
  });

});

describe("createCreateRelationshipBatch", () => {

  test("Executed batch creates the relationship and its specializations.", async () => {
    const context = createOperationTestContext();
    const model = context.semanticModel.getId();
    const a = await createClass(context, "a");
    const b = await createClass(context, "b");
    const parent = await createRelationship(context, a, b, "parent");
    const state = createState(model, {
      domain: { identifier: a }, range: { identifier: b }, order: "1",
      specializations: [specialization(parent, null)],
    });

    const { batch, created } = createCreateRelationshipBatch(context.createContext, state);
    const outcome = await context.executor.execute(batch);

    expect(outcome.exception).toBeUndefined();
    expect(created.model).toBe(model);
    const entity = context.semanticModel.getEntities()[created.identifier] as SemanticModelRelationship;
    expect(entity.ends[0]).toMatchObject({ concept: a, cardinality: [0, 1] });
    expect(entity.ends[1]).toMatchObject({
      concept: b, cardinality: [1, null], iri: "http://example.com/r", name: { en: "Relationship" }, order: "1",
    });
    expect(parentsOf(context, created.identifier)).toEqual([parent]);
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
    iri: "http://example.com/r",
    name: { en: "Relationship" },
    description: { en: "Description" },
    domain: { identifier: "domain" },
    domainCardinality: { cardinality: [0, 1] },
    range: { identifier: "range" },
    rangeCardinality: { cardinality: [1, null] },
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

function parentsOf(context: OperationTestContext, child: string): string[] {
  return Object.values(context.semanticModel.getEntities())
    .filter(isSemanticModelGeneralization)
    .filter(item => item.child === child)
    .map(item => item.parent);
}
