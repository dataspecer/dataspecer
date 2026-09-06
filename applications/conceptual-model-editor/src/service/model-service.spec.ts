/**
 * Characterization tests for {@link findSourceModelOfEntity}.
 *
 * We need to replaces the ~30 call sites of this `@deprecated - very slow`
 * function with `sourceModelOfEntityMap` lookups. These tests pin the current
 * behaviour so the replacement can be checked against it:
 * - for a semantic entity, the function returns the owning model, and its id
 *   matches what `propagateAggregatorChangesToLocalState` records in the map,
 * - for an unknown id it returns `null`.
 *
 * The `models` map handed to this function (`ModelGraphContextType.models`)
 * only ever contains `EntityModel`s; visual models live in a separate map, so
 * they are not exercised here.
 */

import { describe, expect, test } from "vitest";

import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import { SemanticModelAggregator } from "@dataspecer/core-v2/semantic-model/aggregator";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createClass, CreatedEntityOperationResult } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultVisualModelFactory } from "@dataspecer/visual-model";

import { findSourceModelOfEntity } from "./model-service";
import { propagateAggregatorChangesToLocalState } from "../page-aggregator-sync";

function buildFixture() {
  const semanticModel = new InMemorySemanticModel();
  const first = semanticModel.executeOperation(
    createClass({ iri: "http://example/first" })) as CreatedEntityOperationResult;
  const second = semanticModel.executeOperation(
    createClass({ iri: "http://example/second" })) as CreatedEntityOperationResult;

  const visualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);

  const aggregator = new SemanticModelAggregator();
  aggregator.addModel(semanticModel);
  aggregator.addModel(visualModel);
  const aggregatorView = aggregator.getView();

  const models = new Map<string, EntityModel>([
    [semanticModel.getId(), semanticModel],
  ]);

  return { semanticModel, first, second, aggregatorView, models };
}

describe("findSourceModelOfEntity", () => {

  test("returns the owning model for a semantic entity", () => {
    const { semanticModel, first, second, models } = buildFixture();
    expect(findSourceModelOfEntity(first.id, models)).toBe(semanticModel);
    expect(findSourceModelOfEntity(second.id, models)).toBe(semanticModel);
  });

  test("returns null for an unknown id", () => {
    const { models } = buildFixture();
    expect(findSourceModelOfEntity("does-not-exist", models)).toBeNull();
  });

  test("agrees with sourceModelOfEntityMap for semantic entities", () => {
    const { semanticModel, first, second, aggregatorView, models } = buildFixture();

    let capturedMap = new Map<string, string>();
    propagateAggregatorChangesToLocalState(
      [], [],
      () => undefined, () => undefined, () => undefined, () => undefined,
      (next) => { capturedMap = typeof next === "function" ? next(capturedMap) : next; },
      () => undefined, () => undefined,
      aggregatorView as any,
    );

    for (const id of [first.id, second.id]) {
      expect(findSourceModelOfEntity(id, models)?.getId()).toBe(capturedMap.get(id));
      expect(capturedMap.get(id)).toBe(semanticModel.getId());
    }
  });

});
