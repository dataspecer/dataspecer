/**
 * Characterization tests for {@link propagateAggregatorChangesToLocalState}.
 *
 * These pin the current behaviour before Stage 2 makes the
 * `sourceModelOfEntityMap` rebuild incremental. They assert:
 * - how updated entities are bucketed into classes / relationships /
 *   generalizations / class-profiles / relationship-profiles,
 * - that relationships whose both ends carry an IRI are dropped (raw only),
 * - that `rawEntities` collects every non-null raw entity,
 * - that removed ids are pruned from every collection,
 * - that `sourceModelOfEntityMap` maps every semantic entity to its model and
 *   ignores visual models.
 */

import { describe, expect, test } from "vitest";
import type { Dispatch, SetStateAction } from "react";

import { SemanticModelAggregator } from "@dataspecer/core-v2/semantic-model/aggregator";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createClass, CreatedEntityOperationResult } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultVisualModelFactory } from "@dataspecer/visual-model";

import { propagateAggregatorChangesToLocalState } from "./page-aggregator-sync";

/** A setter that records the value produced by React-style functional updates. */
function recordingSetter<Type>(initial: Type): { setter: Dispatch<SetStateAction<Type>>, get: () => Type } {
  let current = initial;
  const setter = ((next: SetStateAction<Type>) => {
    current = typeof next === "function"
      ? (next as (previous: Type) => Type)(current)
      : next;
  }) as Dispatch<SetStateAction<Type>>;
  return { setter, get: () => current };
}

function createSinks() {
  return {
    classes: recordingSetter<any[]>([]),
    relationships: recordingSetter<any[]>([]),
    generalizations: recordingSetter<any[]>([]),
    rawEntities: recordingSetter<any[]>([]),
    sourceModelOfEntityMap: recordingSetter<Map<string, string>>(new Map()),
    classProfiles: recordingSetter<any[]>([]),
    relationshipProfiles: recordingSetter<any[]>([]),
  };
}

function run(
  sinks: ReturnType<typeof createSinks>,
  updated: unknown[],
  removed: string[],
  aggregator: unknown,
) {
  propagateAggregatorChangesToLocalState(
    updated as any,
    removed,
    sinks.classes.setter,
    sinks.relationships.setter,
    sinks.generalizations.setter,
    sinks.rawEntities.setter,
    sinks.sourceModelOfEntityMap.setter,
    sinks.classProfiles.setter,
    sinks.relationshipProfiles.setter,
    aggregator as any,
  );
}

const emptyAggregator = { getModels: () => new Map() };

const wrapper = (aggregatedEntity: unknown, rawEntity: unknown = aggregatedEntity) =>
  ({ aggregatedEntity, rawEntity });

describe("propagateAggregatorChangesToLocalState - bucketing", () => {

  const classEntity = { id: "c1", type: ["class"], iri: "", name: {}, description: {} };
  const relationshipEntity = {
    id: "r1", type: ["relationship"],
    ends: [{ iri: null, concept: "c1" }, { iri: null, concept: "c2" }],
  };
  const relationshipWithTwoIris = {
    id: "r2", type: ["relationship"],
    ends: [{ iri: "http://example/a" }, { iri: "http://example/b" }],
  };
  const generalizationEntity = { id: "g1", type: ["generalization"], iri: "", child: "c1", parent: "c2" };
  const classProfileEntity = { id: "cp1", type: ["class-profile"], profiling: ["c1"] };
  const relationshipProfileEntity = {
    id: "rp1", type: ["relationship-profile"],
    ends: [{ iri: null }, { iri: null }],
  };

  test("routes each entity kind to its own collection", () => {
    const sinks = createSinks();
    run(sinks, [
      wrapper(classEntity),
      wrapper(relationshipEntity),
      wrapper(generalizationEntity),
      wrapper(classProfileEntity),
      wrapper(relationshipProfileEntity),
    ], [], emptyAggregator);

    expect(sinks.classes.get()).toStrictEqual([classEntity]);
    expect(sinks.relationships.get()).toStrictEqual([relationshipEntity]);
    expect(sinks.generalizations.get()).toStrictEqual([generalizationEntity]);
    expect(sinks.classProfiles.get()).toStrictEqual([classProfileEntity]);
    expect(sinks.relationshipProfiles.get()).toStrictEqual([relationshipProfileEntity]);
  });

  test("drops a relationship whose both ends have an IRI, keeping only its raw entity", () => {
    const sinks = createSinks();
    const raw = { id: "r2-raw" };
    run(sinks, [wrapper(relationshipWithTwoIris, raw)], [], emptyAggregator);

    expect(sinks.relationships.get()).toStrictEqual([]);
    expect(sinks.rawEntities.get()).toStrictEqual([raw]);
  });

  test("collects every non-null raw entity in input order", () => {
    const sinks = createSinks();
    const raws = {
      c1: { id: "c1-raw" },
      r1: { id: "r1-raw" },
      r2: { id: "r2-raw" },
      g1: { id: "g1-raw" },
      cp1: { id: "cp1-raw" },
      rp1: { id: "rp1-raw" },
    };
    run(sinks, [
      wrapper(classEntity, raws.c1),
      wrapper(relationshipEntity, raws.r1),
      wrapper(relationshipWithTwoIris, raws.r2),
      wrapper(generalizationEntity, raws.g1),
      wrapper(classProfileEntity, raws.cp1),
      wrapper(relationshipProfileEntity, raws.rp1),
    ], [], emptyAggregator);

    expect(sinks.rawEntities.get()).toStrictEqual([
      raws.c1, raws.r1, raws.r2, raws.g1, raws.cp1, raws.rp1,
    ]);
  });

  test("throws on an unknown entity kind", () => {
    const sinks = createSinks();
    expect(() => run(
      sinks, [wrapper({ id: "x", type: ["something-else"] })], [], emptyAggregator,
    )).toThrow("Unknown type of updated entity.");
  });
});

describe("propagateAggregatorChangesToLocalState - removal", () => {

  test("prunes removed ids from every collection", () => {
    const sinks = createSinks();
    const keptClass = { id: "c-keep", type: ["class"], iri: "", name: {}, description: {} };
    const staleClass = { id: "c-stale", type: ["class"], iri: "", name: {}, description: {} };

    // Seed state.
    run(sinks, [wrapper(keptClass), wrapper(staleClass)], [], emptyAggregator);
    expect(sinks.classes.get().map(it => it.id)).toStrictEqual(["c-keep", "c-stale"]);

    // Remove one.
    run(sinks, [], ["c-stale"], emptyAggregator);
    expect(sinks.classes.get().map(it => it.id)).toStrictEqual(["c-keep"]);
  });
});

describe("propagateAggregatorChangesToLocalState - sourceModelOfEntityMap", () => {

  test("maps every semantic entity to its model and ignores visual models", () => {
    const semanticModel = new InMemorySemanticModel();
    const first = semanticModel.executeOperation(
      createClass({ iri: "http://example/first" })) as CreatedEntityOperationResult;
    const second = semanticModel.executeOperation(
      createClass({ iri: "http://example/second" })) as CreatedEntityOperationResult;

    const visualModel = createDefaultVisualModelFactory().createNewWritableVisualModelSync(null);
    visualModel.addVisualNode({
      representedEntity: first.id,
      model: semanticModel.getId(),
      content: [],
      visualModels: [],
      position: { x: 0, y: 0, anchored: null },
    });

    const aggregator = new SemanticModelAggregator();
    aggregator.addModel(semanticModel);
    aggregator.addModel(visualModel);
    const aggregatorView = aggregator.getView();

    const sinks = createSinks();
    run(sinks, [], [], aggregatorView);

    const map = sinks.sourceModelOfEntityMap.get();
    expect(map.get(first.id)).toBe(semanticModel.getId());
    expect(map.get(second.id)).toBe(semanticModel.getId());
    // Visual entities must not leak into the map.
    for (const value of map.values()) {
      expect(value).toBe(semanticModel.getId());
    }
  });
});
